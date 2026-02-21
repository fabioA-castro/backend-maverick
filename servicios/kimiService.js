/**
 * Servicio para llamar a la API de Kimi con 1 a 4 llaves.
 * Round-robin entre llaves activas; si una falla por cupo diario (TPD), se prueba la siguiente.
 */

const KIMI_URL = (process.env.KIMI_API_URL || 'https://kimi-k2.ai/api/v1/chat/completions').trim();
const KIMI_MODEL = (process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct-0905').trim();
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

function getKeyParaSlot(n) {
  if (n < 1 || n > MAX_LLAVES) return '';
  const k1 = (process.env.KIMI_API_KEY || process.env.KIMI_API_KEY_1 || '').trim();
  const kn = n === 1 ? k1 : (process.env['KIMI_API_KEY_' + n] || '').trim();
  return n === 1 ? k1 : kn;
}

function obtenerLlaves() {
  return [1, 2, 3, 4].map(n => getKeyParaSlot(n));
}

function getNumLlaves() {
  return obtenerLlaves().filter(Boolean).length;
}

function getModeloParaLlave(n) {
  if (n < 1 || n > MAX_LLAVES) return KIMI_MODEL;
  const v = (process.env['KIMI_LLAVE_' + n + '_MODELO'] || '').trim();
  return v || KIMI_MODEL;
}

function getLlavesBC3() {
  const v = (process.env.KIMI_LLAVE_SOLO_BC3 || process.env.LLAVE_SOLO_BC3 || '').trim();
  if (!v) return null;
  const partes = v.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= MAX_LLAVES);
  const unicos = [...new Set(partes)];
  return unicos.length > 0 ? unicos : null;
}

const MAX_BODY_BYTES = Math.min(2 * 1024 * 1024, Math.max(100000, parseInt(process.env.KIMI_MAX_BODY_BYTES || '900000', 10) || 900000));

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
      `La solicitud a Kimi es demasiado grande (${(bodyStr.length / 1024).toFixed(0)} KB). Reduce el tamaño del prompt o del bloque BC3.`
    );
  }
  let response;
  try {
    response = await fetch(KIMI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: bodyStr,
    });
  } catch (err) {
    throw new Error('Error de red al llamar a Kimi: ' + (err?.message || err));
  }
  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error('Kimi devolvió respuesta no JSON (status ' + response.status + ').');
  }
  if (!response.ok) {
    const msg = (data && data.error && data.error.message) ? data.error.message : 'Error Kimi';
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
  const llavesBC3 = getLlavesBC3();
  const esArbolBC3 = !!opciones.esArbolBC3;

  const numKeys = keys.length;
  if (numKeys === 0) {
    throw new Error('Ninguna llave Kimi configurada o todas están bloqueadas desde la app (GET /llaves → POST /llaves para activar).');
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
    if (indicesBC3.length > 0) {
      let ultimoError = null;
      const numBC3 = indicesBC3.length;
      const orden = [...Array(numBC3)].map((_, k) => indicesBC3[(roundRobinBC3Index + k) % numBC3]);
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
    const nombre = (process.env['KIMI_LLAVE_' + n + '_NOMBRE'] || process.env['KIMI_LLAVE_NOMBRE_' + n] || ('kimi_llave_' + n)).trim();
    const modelo = getModeloParaLlave(n);
    const info_limite = 'Esta llave permite más llamadas por día.';
    return { numero: n, configurada: true, nombre: nombre || 'kimi_llave_' + n, proveedor: 'kimi', modelo, info_limite };
  });
  const override = getLlavesActivas();
  const activas = override === undefined ? [1] : (override === null ? configuradas.map(c => c.numero) : override);
  return { llaves: configuradas, activas };
}

module.exports = {
  llamarKimi,
  getNumLlaves,
  getModeloParaLlave,
  getLlavesBC3,
  getInfoLlaves,
  setLlavesActivas,
  getLlavesActivas,
};
