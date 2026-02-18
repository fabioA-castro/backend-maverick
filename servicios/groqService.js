/**
 * Servicio para llamar a la API de Groq.
 * Si mañana cambias de modelo o proveedor, solo tocas aquí (y config.json).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function llamarGroq(mensajes, opciones = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada en el servidor');
  }

  const modelo = opciones.modelo || 'llama-3.3-70b-versatile';
  const temperatura = opciones.temperatura ?? 0.2;
  const max_tokens = opciones.max_tokens ?? 1024;

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: mensajes,
      temperature: temperatura,
      max_tokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Error Groq';
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

module.exports = { llamarGroq };
