/**
 * Servicio para llamar a la API de Groq con 1 a 4 llaves.
 * - Una llave: siempre esa.
 * - Dos, tres o cuatro llaves: reparto por turno (round-robin); el día se reparte entre las N. TPD → siguiente llave; TPM → esperar y misma llave.
 * - Tres o cuatro llaves: reparto por bloque (árbol) y round-robin en el resto; si una falla (TPD/TPM) se prueba la siguiente.
 * La app Android no se entera; Railway/backend lo resuelve.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Máximo de llaves. 1: CLAVE_API_GROQ_2; 2: GROQ_API_KEY o "CLAVE DE API DE GROQ"; 3: GROQ_MODELO_1/GROQ_API_KEY_3; 4: GROQ_API_KEY_4. */
const MAX_LLAVES = 4;

/** Índice para round-robin cuando hay 3+ llaves (no usamos groqRotacion). */
let roundRobinIndex = 0;

/** Construye el array de llaves desde env. [0]=llave1, [1]=llave2, etc. */
function obtenerLlaves() {
  const key1 = (process.env.CLAVE_API_GROQ_2 || process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const key2 = (process.env.GROQ_API_KEY || process.env['CLAVE DE API DE GROQ'] || '').trim();
  const key3 = (process.env.GROQ_MODELO_1 || process.env.GROQ_API_KEY_3 || '').trim();
  const key4 = (process.env.GROQ_API_KEY_4 || '').trim();
  return [key1, key2, key3, key4].filter(Boolean);
}

/** Número de llaves configuradas (para exportar al controlador). */
function getNumLlaves() {
  return obtenerLlaves().length;
}

/** Si está definido (1-4), esa llave se usa SOLO para árbol BC3; el resto de peticiones usan las otras llaves. */
function getLlaveSoloBC3() {
  const v = process.env.GROQ_LLAVE_SOLO_BC3 || process.env.LLAVE_SOLO_BC3 || '';
  const n = parseInt(v, 10);
  return n >= 1 && n <= MAX_LLAVES ? n : null;
}

/** ID del modelo compound en Groq (70K TPM, 250 RPD). */
const MODELO_COMPOUND = 'groq/compound';

/** Primera llave (1-4) que tiene modelo groq/compound; para creación de JSON/árbol BC3 (muchos tokens). */
function getLlaveCompuesto() {
  for (let n = 1; n <= MAX_LLAVES; n++) {
    const m = getModeloParaLlave(n);
    if (m && (m.toLowerCase().includes('groq/compound') || m.toLowerCase().includes('groq/compuesto'))) return n;
  }
  return null;
}

/** Modelo por llave (1-4). Variables GROQ_MODEL_1 … GROQ_MODEL_4. Si no hay, usamos el modelo por defecto (compound). */
function getModeloParaLlave(numLlave) {
  if (numLlave < 1 || numLlave > MAX_LLAVES) return '';
  return (process.env['GROQ_MODEL_' + numLlave] || process.env['GROQ_MODEL_LLAVE_' + numLlave] || '').trim();
}

/** Opciones con el modelo a usar para esa llave. Siempre acabamos usando groq/compound (único modelo del backend). */
function optsConModeloParaLlave(opts, numLlave) {
  const modeloLlave = getModeloParaLlave(numLlave);
  const modelo = (modeloLlave && modeloLlave.toLowerCase().includes('groq/compound')) ? modeloLlave : MODELO_COMPOUND;
  return { ...opts, modelo };
}

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
  return m.includes('límite de velocidad') || m.includes('rate limit') || m.includes('tokens por minuto') || m.includes('tpm') || m.includes('tokens per day') || m.includes('tpd');
}

/** True si el error es por límite de tokens por día (TPD). Con TPD no sirve esperar; hay que usar la otra llave. */
function esTPD(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return false;
  const m = mensaje.toLowerCase();
  return m.includes('tokens per day') || m.includes('tokens por día') || m.includes('tpd');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const modelo = opciones.modelo || MODELO_COMPOUND;
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
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

async function llamarGroq(mensajes, opciones = {}) {
  let keys = obtenerLlaves();
  const llaveSoloBC3 = getLlaveSoloBC3();
  const esArbolBC3 = !!opciones.esArbolBC3;

  // La llave de BC3 (GROQ_LLAVE_SOLO_BC3 o la que tiene groq/compuesto) solo se usa para creación JSON/árbol; el resto no la usa.
  const llaveSoloParaBC3 = llaveSoloBC3 ?? getLlaveCompuesto();
  if (llaveSoloParaBC3 != null && !esArbolBC3) {
    keys = keys.filter((_, i) => i !== llaveSoloParaBC3 - 1);
  }
  const numKeys = keys.length;
  if (numKeys === 0) {
    throw new Error('Ninguna llave Groq configurada (GROQ_API_KEY, GROQ_API_KEY_2, etc.)');
  }
  const keyPrincipal = keys[0];
  const tieneDos = numKeys >= 2;

  const opts = {
    modelo: opciones.modelo || MODELO_COMPOUND,
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };

  // Creación de JSON/árbol BC3: usar llave con groq/compuesto (muchos tokens) o la dedicada GROQ_LLAVE_SOLO_BC3.
  const llaveCompuesto = getLlaveCompuesto();
  const llaveBC3 = llaveSoloBC3 ?? llaveCompuesto;
  if (esArbolBC3 && llaveBC3 != null) {
    const keysCompletas = obtenerLlaves();
    const idxBC3 = llaveBC3 - 1;
    if (idxBC3 < keysCompletas.length && keysCompletas[idxBC3]) {
      const apiKeyBC3 = keysCompletas[idxBC3];
      let ultimoError = null;
      const optsBC3 = { ...opts, modelo: MODELO_COMPOUND };
      for (let r = 0; r < MAX_REINTENTOS_TPM_MISMA_LLAVE; r++) {
        try {
          return await llamarGroqConClave(apiKeyBC3, mensajes, optsBC3);
        } catch (e) {
          ultimoError = e;
          const msg = e?.message || '';
          if (esTPD(msg)) {
            console.warn('[Groq] Llave BC3', llaveBC3, 'TPD agotado; no se usa otra llave.');
            throw new Error((ultimoError?.message || msg) + ' (llave BC3 sin cupo).');
          }
          const seg = parsearRetrySegundos(msg);
          if (seg > 0 && esRateLimit(msg)) {
            console.warn('[Groq] Llave BC3', llaveBC3, 'límite TPM; esperando', seg, 's…');
            await sleep(seg * 1000);
          } else throw e;
        }
      }
      throw new Error((ultimoError?.message || '') + '');
    }
  }

  if (!llamarGroq._loggedModel) {
    console.log('Groq request usando modelo:', opts.modelo);
    llamarGroq._loggedModel = true;
  }

  // Rotación por bloque (árbol BC3): la app envía INDICE_BLOQUE; usamos llave (indice % numKeys)+1. Si falla por TPD/TPM, probamos las demás.
  const llaveForzada = opciones.llaveForzada >= 1 && opciones.llaveForzada <= numKeys ? opciones.llaveForzada : null;
  if (tieneDos && llaveForzada != null) {
    const apiKeyPrimera = keys[llaveForzada - 1];
    const otrasIndices = [...Array(numKeys).keys()].filter(i => i !== llaveForzada - 1);
    let lastRetry = 0;
    let ultimoError = null;
    // TPD (tokens/día): no sirve esperar; probar la otra llave de inmediato.
    const optsForzada = optsConModeloParaLlave(opts, llaveForzada);
    for (let r = 0; r < MAX_REINTENTOS_TPM_MISMA_LLAVE; r++) {
      try {
        const resultado = await llamarGroqConClave(apiKeyPrimera, mensajes, optsForzada);
        return resultado;
      } catch (e) {
        ultimoError = e;
        const msg = e?.message || '';
        if (esTPD(msg)) {
          console.warn('[Groq] Bloque llave', llaveForzada, 'TPD agotado; probando el resto de llaves…');
          for (const i of otrasIndices) {
            try {
              return await llamarGroqConClave(keys[i], mensajes, optsConModeloParaLlave(opts, i + 1));
            } catch (_) {}
          }
          throw new Error((ultimoError?.message || msg) + ' (todas las llaves sin cupo).');
        }
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
    // Tras 3 reintentos TPM con la llave forzada, probar el resto de llaves.
    console.warn('[Groq] Bloque llave', llaveForzada, 'falló tras reintentos; probando el resto…');
    for (const i of otrasIndices) {
      try {
        return await llamarGroqConClave(keys[i], mensajes, optsConModeloParaLlave(opts, i + 1));
      } catch (e2) {
        ultimoError = e2;
      }
    }
    throw new Error((ultimoError?.message || 'TPM') + (lastRetry ? ` Inténtelo de nuevo en ${lastRetry} s.` : ''));
  }

  // Una llave: reintentos TPM y devolver o lanzar.
  if (numKeys === 1) {
    const opts1 = optsConModeloParaLlave(opts, 1);
    let lastRetry = 0;
    let ultimoE = null;
    for (let r = 0; r < MAX_REINTENTOS_TPM_MISMA_LLAVE; r++) {
      try {
        return await llamarGroqConClave(keyPrincipal, mensajes, opts1);
      } catch (e) {
        ultimoE = e;
        const msg = e?.message || '';
        const seg = parsearRetrySegundos(msg);
        if (seg > 0 && esRateLimit(msg)) {
          lastRetry = seg;
          await sleep(seg * 1000);
        } else throw e;
      }
    }
    throw new Error((ultimoE?.message || '') + (lastRetry ? ` Inténtelo de nuevo en ${lastRetry} s.` : ''));
  }

  // 2, 3 o 4 llaves: reparto por turno (round-robin). El día se reparte entre las que tengas.
  if (tieneDos) {
    let ultimoErr = null;
    for (let i = 0; i < numKeys; i++) {
      const idx = (roundRobinIndex + i) % numKeys;
      const apiKey = keys[idx];
      const numLlave = idx + 1;
      const optsLlave = optsConModeloParaLlave(opts, numLlave);
      try {
        const resultado = await llamarGroqConClave(apiKey, mensajes, optsLlave);
        roundRobinIndex = (roundRobinIndex + 1) % numKeys;
        return resultado;
      } catch (e) {
        ultimoErr = e;
        const msg = e?.message || '';
        if (esTPD(msg)) {
          console.warn('[Groq] Llave', numLlave, 'cupo diario (TPD) agotado; probando siguiente.');
          continue;
        }
        const seg = parsearRetrySegundos(msg);
        if (seg > 0 && esRateLimit(msg)) {
          console.warn('[Groq] Llave', numLlave, 'límite TPM; esperando', seg, 's (reintento misma llave).');
          await sleep(seg * 1000);
          try {
            const resultado = await llamarGroqConClave(apiKey, mensajes, optsLlave);
            roundRobinIndex = (roundRobinIndex + 1) % numKeys;
            return resultado;
          } catch (_) {}
        }
      }
    }
    throw new Error((ultimoErr?.message || 'Todas las llaves fallaron.') + '');
  }
}

module.exports = { llamarGroq, getNumLlaves, getModeloParaLlave, getLlaveCompuesto };
