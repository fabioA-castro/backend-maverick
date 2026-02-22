/**
 * Servicio para llamar a la API de Groq (llaves 1-4) y Hugging Face (llave 5 si HF_TOKEN está configurado).
 */
const GROQ_URL = (process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions').trim();
const KIMI_MODEL = (process.env.KIMI_MODEL || process.env.GROQ_MODEL || 'moonshotai/kimi-k2-instruct-0905').trim();
const MAX_LLAVES = 5;

let huggingFaceService;
function getHuggingFace() {
  if (!huggingFaceService) huggingFaceService = require('./huggingFaceService');
  return huggingFaceService;
}

let roundRobinIndex = 0;
let roundRobinBC3Index = 0;
let llavesActivasOverride = undefined;

function setLlavesActivas(numeros) {
  if (numeros === null) {
    llavesActivasOverride = null;
    return;
  }
  if (Array.isArray(numeros) && numeros.length > 0) {
    llavesActivasOverride = numeros.filter(n => n >= 1 && n <= 5);
    return;
  }
  llavesActivasOverride = null;
}
function getLlavesActivas() {
  return llavesActivasOverride;
}

/** Llaves: 1-4 Groq, 5 = Hugging Face (sentinel "HF") si está configurado. */
function getKeyParaSlot(n) {
  if (n < 1 || n > 5) return '';
  if (n === 5) return getHuggingFace().estaConfigurado() ? 'HF' : '';
  const key1 = (process.env.GROQ_API_KEY || process.env['CLAVE DE API DE GROQ'] || '').trim();
  const key2 = (process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API GROQ_2'] || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const key3 = (process.env.GROQ_API_KEY_3 || '').trim();
  const key4 = (process.env.GROQ_API_KEY_4 || process.env.CLAVE_DE_API_DE_GROQ_4 || process.env['CLAVE DE API DE GROQ 4'] || '').trim();
  const arr = [key1, key2, key3, key4];
  return (arr[n - 1] || '').trim();
}

function obtenerLlaves() {
  return [1, 2, 3, 4, 5].map(n => getKeyParaSlot(n));
}

function getNumLlaves() {
  return obtenerLlaves().filter(Boolean).length;
}

function getModeloParaLlave(n) {
  if (n === 5) return getHuggingFace().getModelId() || 'Hugging Face';
  if (n < 1 || n > 4) return KIMI_MODEL;
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
  const activas = override === undefined ? [1] : (override === null ? [1, 2, 3, 4, 5].filter(n => allKeys[n - 1]) : override);
  const llaveFijada = getLlaveBC3PorTarea();
  const esArbolBC3 = !!opciones.esArbolBC3;
  // Si hay una llave fijada para BC3, el resto de peticiones (variantes, etc.) no la usan: solo las otras activas
  const activasParaResto = llaveFijada != null ? activas.filter(n => n !== llaveFijada) : activas;
  let keys = activasParaResto.map(n => allKeys[n - 1]).filter(Boolean);
  const keyNumeros = activasParaResto.filter((_, i) => keys[i]);
  const llavesBC3 = llaveFijada != null ? [llaveFijada] : getLlavesBC3();

  const numKeys = keys.length;
  if (numKeys === 0) {
    throw new Error(
      esArbolBC3
        ? 'Ninguna llave configurada para BC3 o la llave fijada no está activa.'
        : 'Ninguna llave disponible para esta tarea. La única llave activa está dedicada a la creación del JSON/árbol BC3.'
    );
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
    const activasSet = new Set(activas);
    const indicesBC3Activas = indicesBC3.filter(i => activasSet.has(i + 1));
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
            const resultado = await llamarConCualquierLlave(apiKeyBC3, mensajes, optsBC3);
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
        return await llamarConCualquierLlave(keys[0], mensajes, opts1);
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
      const resultado = await llamarConCualquierLlave(apiKey, mensajes, optsLlave);
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
          const resultado = await llamarConCualquierLlave(apiKey, mensajes, optsLlave);
          roundRobinIndex = (roundRobinIndex + 1) % numKeys;
          return resultado;
        } catch (_) {}
      }
    }
  }
  throw new Error((ultimoErr?.message || 'Todas las llaves fallaron.') + '');
}

/** Llave 5 = Hugging Face: llama a HF. Resto = Groq. */
async function llamarConCualquierLlave(apiKey, mensajes, opts) {
  if (apiKey === 'HF') {
    return getHuggingFace().llamarHuggingFace(mensajes, {
      max_tokens: opts.max_tokens ?? 4096,
      temperatura: opts.temperatura ?? 0.2,
    });
  }
  return llamarKimiConClave(apiKey, mensajes, opts);
}

function getInfoLlaves() {
  const allKeys = obtenerLlaves();
  const configuradas = [];
  for (let n = 1; n <= 5; n++) {
    if (!allKeys[n - 1]) continue;
    const nombre = n === 5
      ? (process.env.HF_LLAVE_5_NOMBRE || 'Hugging Face').trim()
      : (process.env['GROQ_LLAVE_' + n + '_NOMBRE'] || process.env['GROQ_LLAVE_NOMBRE_' + n] || ('Llave ' + n)).trim();
    const modelo = getModeloParaLlave(n);
    const info_limite = n === 5 ? 'Límites según modelo en router.huggingface.co' : '60 solicitudes/min, 1.000/día. 10K tokens/min, 300K tokens/día.';
    configuradas.push({ numero: n, configurada: true, nombre: nombre || 'Llave ' + n, proveedor: n === 5 ? 'huggingface' : 'kimi', modelo, info_limite });
  }
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
