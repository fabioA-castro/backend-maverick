/**
 * Servicio para llamar a la API de Groq con fallback automático entre llaves.
 * 1) Intenta con la llave principal (GROQ_API_KEY).
 * 2) Si falla por cualquier motivo (rate limit, sin saldo, error), usa la llave de respaldo (GROQ_API_KEY_2).
 * La app Android no se entera; Railway/backend lo resuelve.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opciones.modelo || 'llama3-70b-8192',
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
  const key1 = process.env.GROQ_API_KEY?.trim();
  const key2 = (process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const keyPrincipal = key1 || key2;
  if (!keyPrincipal) {
    throw new Error('GROQ_API_KEY no configurada en el servidor');
  }

  const opts = {
    modelo: opciones.modelo || 'llama3-70b-8192',
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };

  if (!llamarGroq._loggedModel) {
    console.log('Groq request usando modelo:', opts.modelo);
    llamarGroq._loggedModel = true;
  }

  try {
    return await llamarGroqConClave(keyPrincipal, mensajes, opts);
  } catch (e) {
    if (key1 && key2 && keyPrincipal === key1) {
      console.log('La API con la llave principal falló, usando la llave de respaldo...', e?.message || e);
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
