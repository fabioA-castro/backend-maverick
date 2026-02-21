/**
 * Servicio para llamar a la API de Groq con 1 a 4 llaves.
 * - Una llave: siempre esa.
 * - Dos, tres o cuatro llaves: reparto por turno (round-robin); el día se reparte entre las N. TPD → siguiente llave; TPM → esperar y misma llave.
 * - Tres o cuatro llaves: reparto por bloque (árbol) y round-robin en el resto; si una falla (TPD/TPM) se prueba la siguiente.
 * La app Android no se entera; Railway/backend lo resuelve.
 */

/** URL de la API de Groq. Por defecto la oficial; puedes cambiarla con la variable de entorno GROQ_API_URL. */
const GROQ_URL = (process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions').trim();

/** Máximo de llaves. 1: CLAVE_API_GROQ_2; 2: GROQ_API_KEY o "CLAVE DE API DE GROQ"; 3: GROQ_MODELO_1/GROQ_API_KEY_3; 4: GROQ_API_KEY_4. */
const MAX_LLAVES = 4;

/** Índice para round-robin cuando hay 3+ llaves (no usamos groqRotacion). */
let roundRobinIndex = 0;
/** Índice para round-robin entre llaves BC3 (cuando GROQ_LLAVE_SOLO_BC3=2,4). */
let roundRobinBC3Index = 0;

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

/** Si está definido (1-4), esa llave se usa SOLO para árbol BC3; el resto de peticiones usan las otras llaves. (Compatibilidad: devuelve la primera si hay varias.) */
function getLlaveSoloBC3() {
  const arr = getLlavesBC3();
  return arr && arr.length > 0 ? arr[0] : null;
}

/** Lista de llaves (1-4) reservadas para JSON/árbol BC3. Variable GROQ_LLAVE_SOLO_BC3: un número "2" o varios "2,4". */
function getLlavesBC3() {
  const v = (process.env.GROQ_LLAVE_SOLO_BC3 || process.env.LLAVE_SOLO_BC3 || '').trim();
  if (!v) return null;
  const partes = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= MAX_LLAVES);
  const unicos = [...new Set(partes)];
  return unicos.length > 0 ? unicos : null;
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

/** Límite aproximado del body que enviamos a Groq (evita 413 Request Entity Too Large). Variable GROQ_MAX_BODY_BYTES, por defecto 900000 (~900KB). */
const GROQ_MAX_BODY_BYTES = Math.min(2 * 1024 * 1024, Math.max(100000, parseInt(process.env.GROQ_MAX_BODY_BYTES || '900000', 10) || 900000));

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const modelo = opciones.modelo || MODELO_COMPOUND;
  const body = {
    model: modelo,
    messages: mensajes,
    temperature: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > GROQ_MAX_BODY_BYTES) {
    throw new Error(
      `La solicitud a Groq es demasiado grande (${(bodyStr.length / 1024).toFixed(0)} KB). ` +
      `Reduce el tamaño del prompt o del bloque BC3 (máx. recomendado ~${(GROQ_MAX_BODY_BYTES / 1024).toFixed(0)} KB).`
    );
  }
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: bodyStr,
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Error Groq';
    const es413 = response.status === 413 || /entidad de solicitud es demasiado grande|request entity too large|payload too large/i.test(msg);
    if (es413) {
      console.warn('[Groq] 413 body demasiado grande. Reduce el bloque BC3 en la app o sube GROQ_MAX_BODY_BYTES en Railway.');
      throw new Error(
        'La solicitud a Groq es demasiado grande (límite de la API). ' +
        'Reduce el tamaño del bloque BC3 en la app (MAX_BC3_CHARS_ARBOL_LLM) o en Railway añade GROQ_MAX_BODY_BYTES menor (ej. 600000) para forzar bloques más pequeños.'
      );
    }
    throw new Error(msg);
  }

  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function llamarGroq(mensajes, opciones = {}) {
  let keys = obtenerLlaves();
  const llavesBC3 = getLlavesBC3() ?? (getLlaveCompuesto() != null ? [getLlaveCompuesto()] : null);
  const esArbolBC3 = !!opciones.esArbolBC3;

  // Las llaves BC3 (GROQ_LLAVE_SOLO_BC3 p. ej. "2,4" o la que tiene groq/compuesto) solo se usan para JSON/árbol; el resto no.
  if (llavesBC3 != null && llavesBC3.length > 0 && !esArbolBC3) {
    const setBC3 = new Set(llavesBC3);
    keys = keys.filter((_, i) => !setBC3.has(i + 1));
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

  // Creación de JSON/árbol BC3: usar llaves GROQ_LLAVE_SOLO_BC3 (ej. "2,4") o la que tiene groq/compuesto; rotación entre ellas.
  const llaveCompuesto = getLlaveCompuesto();
  const llavesBC3ParaPeticion = llavesBC3 && llavesBC3.length > 0 ? llavesBC3 : (llaveCompuesto != null ? [llaveCompuesto] : null);
  if (esArbolBC3 && llavesBC3ParaPeticion != null && llavesBC3ParaPeticion.length > 0) {
    const keysCompletas = obtenerLlaves();
    const indicesBC3 = llavesBC3ParaPeticion.map(n => n - 1).filter(i => i >= 0 && i < keysCompletas.length && keysCompletas[i]);
    if (indicesBC3.length > 0) {
      const optsBC3 = { ...opts, modelo: MODELO_COMPOUND };
      let ultimoError = null;
      // Round-robin entre llaves BC3 para repartir carga (ej. 2 y 4).
      const numBC3 = indicesBC3.length;
      const orden = [...Array(numBC3)].map((_, k) => indicesBC3[(roundRobinBC3Index + k) % numBC3]);
      for (const idx of orden) {
        const numLlave = idx + 1;
        const apiKeyBC3 = keysCompletas[idx];
        for (let r = 0; r < MAX_REINTENTOS_TPM_MISMA_LLAVE; r++) {
          try {
            const resultado = await llamarGroqConClave(apiKeyBC3, mensajes, optsBC3);
            roundRobinBC3Index = (roundRobinBC3Index + 1) % numBC3;
            return resultado;
          } catch (e) {
            ultimoError = e;
            const msg = e?.message || '';
            if (esTPD(msg)) {
              console.warn('[Groq] Llave BC3', numLlave, 'TPD agotado; probando siguiente llave BC3.');
              break; // salir del for r, probar siguiente llave en orden
            }
            const seg = parsearRetrySegundos(msg);
            if (seg > 0 && esRateLimit(msg)) {
              console.warn('[Groq] Llave BC3', numLlave, 'límite TPM; esperando', seg, 's…');
              await sleep(seg * 1000);
            } else {
              throw e;
            }
          }
        }
      }
      throw new Error((ultimoError?.message || 'Llaves BC3 sin cupo o fallo.') + '');
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

module.exports = { llamarGroq, getNumLlaves, getModeloParaLlave, getLlaveCompuesto, getLlavesBC3 };
