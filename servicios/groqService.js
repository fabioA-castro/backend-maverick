/**
 * Servicio para llamar a la API de Groq.
 * Usa GROQ_API_KEY; si hay rate limit y está definida GROQ_API_KEY_2, reintenta con esa.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function esRateLimit(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  return /rate limit|rate_limit|quota|limit reached/i.test(msg);
}

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opciones.modelo || 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: mensajes,
      temperature: opciones.temperatura ?? 0.2,
      max_tokens: opciones.max_tokens ?? 1024,
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
  const key1 = process.env.GROQ_API_KEY?.trim();
  const key2 = process.env.GROQ_API_KEY_2?.trim();

  if (!key1) {
    throw new Error('GROQ_API_KEY no configurada en el servidor');
  }

  const opts = {
    modelo: opciones.modelo || 'meta-llama/llama-4-maverick-17b-128e-instruct',
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 1024,
  };

  // Log del modelo usado (útil en Railway para ver qué modelo se está llamando)
  if (!llamarGroq._loggedModel) {
    console.log('Groq request usando modelo:', opts.modelo);
    llamarGroq._loggedModel = true;
  }

  try {
    return await llamarGroqConClave(key1, mensajes, opts);
  } catch (e) {
    if (esRateLimit(e) && key2) {
      try {
        return await llamarGroqConClave(key2, mensajes, opts);
      } catch (e2) {
        throw e2;
      }
    }
    throw e;
  }
}

module.exports = { llamarGroq };
