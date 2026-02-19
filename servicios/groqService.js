/**
 * Servicio para llamar a la API de Groq con dos llaves (como dos pilas: una trabaja, la otra descansa).
 * - Si hay dos llaves: rotación al 80% (groqRotacion) o al fallar; la que descansa resetea contador.
 * - Si solo hay una llave: se usa siempre esa.
 * La app Android no se entera; Railway/backend lo resuelve.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const { getLlaveActiva, cambiarLlave, registrarLlamada } = require('./groqRotacion');

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
  const key1 = process.env.GROQ_API_KEY?.trim();
  const key2 = (process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
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

  for (let intento = 0; intento < (tieneDos ? 2 : 1); intento++) {
    const apiKey = tieneDos ? getApiKey(key1, key2) : keyPrincipal;
    if (!apiKey) continue;
    try {
      const resultado = await llamarGroqConClave(apiKey, mensajes, opts);
      if (tieneDos) registrarLlamada();
      return resultado;
    } catch (e) {
      if (tieneDos) {
        console.warn('[Groq] Llave', getLlaveActiva(), 'falló:', e?.message || e);
        cambiarLlave();
      } else {
        throw e;
      }
    }
  }

  throw new Error('Ambas llaves fallaron.');
}

module.exports = { llamarGroq };
