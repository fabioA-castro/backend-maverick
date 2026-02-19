/**
 * Servicio para llamar a la API de Groq con dos llaves (como dos pilas: una trabaja, la otra descansa).
 * - Si hay dos llaves: rotación al 80% (groqRotacion) o al fallar; la que descansa resetea contador.
 * - Si solo hay una llave: se usa siempre esa.
 * La app Android no se entera; Railway/backend lo resuelve.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const { getLlaveActiva, cambiarLlave, registrarLlamada } = require('./groqRotacion');

/** Segundos de espera antes de probar la otra llave (da tiempo a que se reinicie el TPM de la que acabamos de dejar). Variable de entorno: GROQ_ESPERA_ENTRE_LLAVES. */
const ESPERA_ENTRE_LLAVES_SEGUNDOS = Math.min(60, Math.max(10, parseInt(process.env.GROQ_ESPERA_ENTRE_LLAVES || '20', 10) || 20));

/** Reintentos con la misma llave cuando falla por TPM (esperar X s + reintentar); así el minuto puede pasar antes de cambiar de llave. */
const MAX_REINTENTOS_TPM_MISMA_LLAVE = 3;

/** Extrae "Inténtelo de nuevo en 18.5625 s" o "try again in 18 seconds" → segundos (entero, máx 30). */
function parsearRetrySegundos(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return 0;
  const en = /try again in (\d+(?:\.\d+)?)\s*(?:s\.?|seconds?)/i.exec(mensaje);
  if (en) return Math.min(30, Math.max(1, Math.ceil(parseFloat(en[1]))));
  const es = /(?:inténtelo de nuevo|intentelo de nuevo)\s+en\s+(\d+(?:[.,]\d+)?)\s*(?:s\.?|segundos?)/i.exec(mensaje);
  if (es) return Math.min(30, Math.max(1, Math.ceil(parseFloat(es[1].replace(',', '.')))));
  return 0;
}

function esRateLimit(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return false;
  const m = mensaje.toLowerCase();
  return m.includes('límite de velocidad') || m.includes('rate limit') || m.includes('tokens por minuto') || m.includes('tpm');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opciones.modelo || 'openai/gpt-oss-120b',
      messages: mensajes,
      temperature: opciones.temperatura ?? 0.2,
      max_tokens: opciones.max_tokens ?? 4096,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Error Groq';
    throw new Error(msg);
  }

  return data?.choices?.[0]?.message?.content?.trim() || '';
}

function getApiKey(key1, key2) {
  return getLlaveActiva() === 1 ? key1 : key2;
}

async function llamarGroq(mensajes, opciones = {}) {
  // Llave 1 = cuenta nueva (variable con "clave": CLAVE_API_GROQ_2, GROQ_API_KEY_2, etc.). Llave 2 = cuenta antigua (GROQ_API_KEY).
  const key1 = (process.env.CLAVE_API_GROQ_2 || process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const key2 = process.env.GROQ_API_KEY?.trim();
  const tieneDos = !!(key1 && key2);
  const keyPrincipal = key1 || key2;
  if (!keyPrincipal) {
    throw new Error('GROQ_API_KEY no configurada en el servidor');
  }

  const opts = {
    modelo: opciones.modelo || 'openai/gpt-oss-120b',
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };

  if (!llamarGroq._loggedModel) {
    console.log('Groq request usando modelo:', opts.modelo);
    llamarGroq._loggedModel = true;
  }

  // Rotación por bloque (árbol BC3): la app envía INDICE_BLOQUE; usamos esa llave solo para esta petición, sin tocar contadores.
  if (tieneDos && (opciones.llaveForzada === 1 || opciones.llaveForzada === 2)) {
    const apiKey = opciones.llaveForzada === 1 ? key1 : key2;
    let lastRetry = 0;
    let ultimoError = null;
    for (let r = 0; r < MAX_REINTENTOS_TPM_MISMA_LLAVE; r++) {
      try {
        const resultado = await llamarGroqConClave(apiKey, mensajes, opts);
        return resultado;
      } catch (e) {
        ultimoError = e;
        const msg = e?.message || '';
        const segundos = parsearRetrySegundos(msg);
        if (segundos > 0 && esRateLimit(msg)) {
          lastRetry = segundos;
          console.warn('[Groq] Bloque llave', opciones.llaveForzada, 'límite TPM; esperando', segundos, 's reintento', r + 1, '/', MAX_REINTENTOS_TPM_MISMA_LLAVE);
          await sleep(segundos * 1000);
        } else {
          throw e;
        }
      }
    }
    throw new Error((ultimoError?.message || 'TPM') + (lastRetry ? ` Inténtelo de nuevo en ${lastRetry} s.` : ''));
  }

  let lastRetrySeconds = 0;
  for (let intento = 0; intento < (tieneDos ? 2 : 1); intento++) {
    const apiKey = tieneDos ? getApiKey(key1, key2) : keyPrincipal;
    if (!apiKey) continue;
    try {
      const resultado = await llamarGroqConClave(apiKey, mensajes, opts);
      if (tieneDos) registrarLlamada();
      return resultado;
    } catch (e) {
      const msg = e?.message || '';
      let segundos = parsearRetrySegundos(msg);
      if (segundos > 0 && esRateLimit(msg)) {
        lastRetrySeconds = segundos;
        let ultimoError = e;
        for (let reintento = 0; reintento < MAX_REINTENTOS_TPM_MISMA_LLAVE; reintento++) {
          console.warn('[Groq] Llave', getLlaveActiva(), 'límite TPM; esperando', segundos, 's antes de reintentar', reintento + 1, '/', MAX_REINTENTOS_TPM_MISMA_LLAVE, '…');
          await sleep(segundos * 1000);
          try {
            const resultado = await llamarGroqConClave(apiKey, mensajes, opts);
            if (tieneDos) registrarLlamada();
            return resultado;
          } catch (e2) {
            ultimoError = e2;
            const msg2 = e2?.message || '';
            const seg2 = parsearRetrySegundos(msg2);
            if (seg2 > 0 && esRateLimit(msg2)) {
              segundos = seg2;
              lastRetrySeconds = segundos;
            } else {
              break;
            }
          }
        }
        if (tieneDos) {
          console.warn('[Groq] Llave', getLlaveActiva(), 'falló tras', MAX_REINTENTOS_TPM_MISMA_LLAVE, 'reintentos; esperando', ESPERA_ENTRE_LLAVES_SEGUNDOS, 's antes de cambiar de llave…');
          await sleep(ESPERA_ENTRE_LLAVES_SEGUNDOS * 1000);
          cambiarLlave();
        } else {
          throw new Error((ultimoError?.message || msg) + (lastRetrySeconds ? ` Inténtelo de nuevo en ${lastRetrySeconds} s.` : ''));
        }
      } else {
        if (tieneDos) {
          console.warn('[Groq] Llave', getLlaveActiva(), 'falló; esperando', ESPERA_ENTRE_LLAVES_SEGUNDOS, 's antes de cambiar de llave…');
          await sleep(ESPERA_ENTRE_LLAVES_SEGUNDOS * 1000);
          cambiarLlave();
        } else {
          throw e;
        }
      }
    }
  }

  const retryText = lastRetrySeconds > 0 ? ` Inténtelo de nuevo en ${lastRetrySeconds} s.` : '';
  throw new Error('Ambas llaves fallaron.' + retryText);
}

module.exports = { llamarGroq };
