/**
 * Servicio para llamar a la API de Groq con modelo Kimi (moonshotai/kimi-k2-instruct-0905).
 * Misma URL y mismas variables que antes: GROQ_API_KEY, GROQ_LLAVE_N_NOMBRE, etc.; solo cambia el modelo.
 */
const GROQ_URL = (process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions').trim();
const KIMI_MODEL = (process.env.KIMI_MODEL || process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct-0905').trim();
const MAX_LLAVES = 4;

let roundRobinIndex = 0;
let roundRobinBC3Index = 0;
let llavesActivasOverride = undefined;

function setLlavesActivas(numeros) {
  if (numeros === null) {
    llavesActivasOverride = null;
    return;
  }
  if (Array.isArray(numeros) && numeros.length > 0) {
    llavesActivasOverride = numeros.filter(n => n >= 1 && n <= MAX_LLAVES);
    return;
  }
  llavesActivasOverride = null;
}
function getLlavesActivas() {
  return llavesActivasOverride;
}

/** Llaves desde Groq (mismos nombres que antes): GROQ_API_KEY, GROQ_API_KEY_2, etc. */
function getKeyParaSlot(n) {
  if (n < 1 || n > MAX_LLAVES) return '';
  const key1 = (process.env.GROQ_API_KEY || process.env['CLAVE DE API DE GROQ'] || '').trim();
  const key2 = (process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const key3 = (process.env.GROQ_API_KEY_3 || '').trim();
  const key4 = (process.env.GROQ_API_KEY_4 || process.env.CLAVE_DE_API_DE_GROQ_4 || process.env['CLAVE DE API DE GROQ 4'] || '').trim();
  const arr = [key1, key2, key3, key4];
  return (arr[n - 1] || '').trim();
}

function obtenerLlaves() {
  return [1, 2, 3, 4].map(n => getKeyParaSlot(n));
}

function getNumLlaves() {
  return obtenerLlaves().filter(Boolean).length;
}

function getModeloParaLlave(n) {
  if (n < 1 || n > MAX_LLAVES) return KIMI_MODEL;
  const v = (process.env['GROQ_LLAVE_' + n + '_MODELO'] || process.env['GROQ_MODEL_' + n] || process.env['KIMI_LLAVE_' + n + '_MODELO'] || '').trim();
  return v || KIMI_MODEL;
}

function getLlavesBC3() {
  const v = (process.env.GROQ_LLAVE_SOLO_BC3 || process.env.LLAVE_SOLO_BC3 || '').trim();
  if (!v) return null;
  const partes = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= MAX_LLAVES);
  const unicos = [...new Set(partes)];
  return unicos.length > 0 ? unicos : null;
}

/** Llave (1-4) fijada por la app para una tarea BC3 en curso; null = no fijada (usar env o todas las activas). */
let llaveBC3PorTarea = null;

function setLlaveBC3PorTarea(n) {
  if (n === null || n === undefined) {
    llaveBC3PorTarea = null;
    return;
  }
  const num = parseInt(n, 10);
  if (num >= 1 && num <= MAX_LLAVES) llaveBC3PorTarea = num;
}

function getLlaveBC3PorTarea() {
  return llaveBC3PorTarea;
}

const MAX_BODY_BYTES = Math.min(2 * 1024 * 1024, Math.max(100000, parseInt(process.env.GROQ_MAX_BODY_BYTES || '900000', 10) || 900000));

function esTPD(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return false;
  const m = mensaje.toLowerCase();
  return m.includes('tokens per day') || m.includes('tokens por día') || m.includes('tpd');
}

function esRateLimit(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return false;
  const m = mensaje.toLowerCase();
  return m.includes('rate limit') || m.includes('límite de velocidad') || m.includes('tpm');
}

function parsearRetrySegundos(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return 0;
  const en = /try again in (\d+(?:\.\d+)?)\s*(?:s\.?|seconds?)/i.exec(mensaje);
  if (en) return Math.min(30, Math.max(1, Math.ceil(parseFloat(en[1]))));
  const es = /(?:inténtelo de nuevo|intentelo de nuevo)\s+en\s+(\d+(?:[.,]\d+)?)\s*(?:s\.?|segundos?)/i.exec(mensaje);
  if (es) return Math.min(30, Math.max(1, Math.ceil(parseFloat(es[1].replace(',', '.')))));
  return 0;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function llamarKimiConClave(apiKey, mensajes, opciones) {
  const modelo = (opciones.modelo && String(opciones.modelo).trim()) || KIMI_MODEL;
  const body = {
    model: modelo,
    messages: mensajes,
    temperature: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > MAX_BODY_BYTES) {
    throw new Error(
      `La solicitud es demasiado grande (${(bodyStr.length / 1024).toFixed(0)} KB). Reduce el tamaño del prompt o del bloque BC3.`
    );
  }
  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: bodyStr,
    });
  } catch (err) {
    throw new Error('Error de red al llamar al backend: ' + (err?.message || err));
  }
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error('Respuesta no JSON (status ' + response.status + ').');
  }
  if (!response.ok) {
    const msg = (data && data.error && data.error.message) ? data.error.message : 'Error API';
    throw new Error(msg);
  }
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
    ? String(data.choices[0].message.content).trim()
    : '';
}

async function llamarKimi(mensajes, opciones = {}) {
  const allKeys = obtenerLlaves();
  const override = getLlavesActivas();
  const activas = override === undefined ? [1] : (override === null ? [1, 2, 3, 4].filter(n => allKeys[n - 1]) : override);
  let keys = activas.map(n => allKeys[n - 1]).filter(Boolean);
  const keyNumeros = activas.filter((_, i) => keys[i]);
  const llaveFijada = getLlaveBC3PorTarea();
  const llavesBC3 = llaveFijada != null ? [llaveFijada] : getLlavesBC3();
  const esArbolBC3 = !!opciones.esArbolBC3;

  const numKeys = keys.length;
  if (numKeys === 0) {
    throw new Error('Ninguna llave configurada en el backend o todas están bloqueadas desde la app (GET /llaves → POST /llaves para activar).');
  }

  const opts = {
    modelo: opciones.modelo || KIMI_MODEL,
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };

  const numLlaveFor = (idx) => (keyNumeros[idx] != null ? keyNumeros[idx] : idx + 1);
  const MAX_REINTENTOS = 3;

  if (esArbolBC3 && llavesBC3 && llavesBC3.length > 0) {
    const keysCompletas = obtenerLlaves();
    const indicesBC3 = llavesBC3.map(n => n - 1).filter(i => i >= 0 && i < keysCompletas.length && keysCompletas[i]);
    const activaSet = new Set(keyNumeros);
    const indicesBC3Activas = indicesBC3.filter(i => activaSet.has(i + 1));
    const listBC3 = llaveFijada != null ? indicesBC3Activas : indicesBC3;
    if (listBC3.length > 0) {
      let ultimoError = null;
      const numBC3 = listBC3.length;
      const orden = [...Array(numBC3)].map((_, k) => listBC3[(roundRobinBC3Index + k) % numBC3]);
      for (const idx of orden) {
        const numLlave = idx + 1;
        const apiKeyBC3 = keysCompletas[idx];
        const modeloLlave = getModeloParaLlave(numLlave);
        const optsBC3 = { ...opts, modelo: modeloLlave };
        for (let r = 0; r < MAX_REINTENTOS; r++) {
          try {
            const resultado = await llamarKimiConClave(apiKeyBC3, mensajes, optsBC3);
            roundRobinBC3Index = (roundRobinBC3Index + 1) % numBC3;
            return resultado;
          } catch (e) {
            ultimoError = e;
            const msg = e?.message || '';
            if (esTPD(msg)) break;
            const seg = parsearRetrySegundos(msg);
            if (seg > 0 && esRateLimit(msg)) await sleep(seg * 1000);
            else throw e;
          }
        }
      }
      throw new Error(`Llaves BC3 no disponibles. ${ultimoError?.message || ''}`);
    }
  }

  if (numKeys === 1) {
    const opts1 = { ...opts, modelo: getModeloParaLlave(keyNumeros[0] || 1) };
    for (let r = 0; r < MAX_REINTENTOS; r++) {
      try {
        return await llamarKimiConClave(keys[0], mensajes, opts1);
      } catch (e) {
        const seg = parsearRetrySegundos(e?.message || '');
        if (seg > 0 && esRateLimit(e?.message || '')) await sleep(seg * 1000);
        else throw e;
      }
    }
  }

  let ultimoErr = null;
  for (let i = 0; i < numKeys; i++) {
    const idx = (roundRobinIndex + i) % numKeys;
    const apiKey = keys[idx];
    const numLlave = numLlaveFor(idx);
    const optsLlave = { ...opts, modelo: getModeloParaLlave(numLlave) };
    try {
      const resultado = await llamarKimiConClave(apiKey, mensajes, optsLlave);
      roundRobinIndex = (roundRobinIndex + 1) % numKeys;
      return resultado;
    } catch (e) {
      ultimoErr = e;
      const msg = e?.message || '';
      if (esTPD(msg)) continue;
      const seg = parsearRetrySegundos(msg);
      if (seg > 0 && esRateLimit(msg)) {
        await sleep(seg * 1000);
        try {
          const resultado = await llamarKimiConClave(apiKey, mensajes, optsLlave);
          roundRobinIndex = (roundRobinIndex + 1) % numKeys;
          return resultado;
        } catch (_) {}
      }
    }
  }
  throw new Error((ultimoErr?.message || 'Todas las llaves fallaron.') + '');
}

function getInfoLlaves() {
  const allKeys = obtenerLlaves();
  const configuradas = [1, 2, 3, 4].filter(n => allKeys[n - 1]).map(n => {
    const nombre = (process.env['GROQ_LLAVE_' + n + '_NOMBRE'] || process.env['GROQ_LLAVE_NOMBRE_' + n] || ('groq_llave_' + n)).trim();
    const modelo = getModeloParaLlave(n);
    const info_limite = '60 solicitudes/min, 1.000/día. 10K tokens/min, 300K tokens/día.';
    return { numero: n, configurada: true, nombre: nombre || 'groq_llave_' + n, proveedor: 'kimi', modelo, info_limite };
  });
  const override = getLlavesActivas();
  const activas = override === undefined ? [1] : (override === null ? configuradas.map(c => c.numero) : override);
  return { llaves: configuradas, activas, solo_bc3_por_tarea: getLlaveBC3PorTarea() };
}

module.exports = {
  llamarKimi,
  getNumLlaves,
  getModeloParaLlave,
  getLlavesBC3,
  getLlaveBC3PorTarea,
  setLlaveBC3PorTarea,
  getInfoLlaves,
  setLlavesActivas,
  getLlavesActivas,
};
