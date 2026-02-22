/**
 * Servicio para llamar a Hugging Face con la API compatible con OpenAI (router.huggingface.co).
 * Igual que el ejemplo oficial: base_url https://router.huggingface.co/v1, api_key HF_TOKEN.
 * Variables: HUGGINGFACE_API_KEY o HF_TOKEN, HUGGINGFACE_MODEL_ID (ej. meta-llama/Llama-4-Maverick-17B-128E-Instruct:groq).
 */
const HF_BASE = (process.env.HUGGINGFACE_API_URL || 'https://router.huggingface.co/v1').trim().replace(/\/$/, '');
const HF_MODEL = (process.env.HUGGINGFACE_MODEL_ID || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct:groq').trim();
const HF_TOKEN = (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '').trim();

const CHAT_URL = `${HF_BASE}/chat/completions`;

function estaConfigurado() {
  return !!HF_TOKEN && !!HF_MODEL;
}

/**
 * Normaliza mensajes al formato que acepta la API (content puede ser string o array de partes).
 */
function normalizarMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0) return [{ role: 'user', content: '' }];
  return mensajes.map(m => ({
    role: m.role || 'user',
    content: typeof m.content === 'string' ? m.content : (Array.isArray(m.content) && m.content[0]?.text ? m.content[0].text : String(m.content || '')),
  }));
}

/**
 * Llama al modelo de Hugging Face (API OpenAI-compatible).
 * @param {Array<{role: string, content: string|object[]}>} mensajes
 * @param {{ max_tokens?: number, temperatura?: number }} opciones
 * @returns {Promise<string>} texto generado
 */
async function llamarHuggingFace(mensajes, opciones = {}) {
  if (!estaConfigurado()) {
    throw new Error('Hugging Face no configurado: define HUGGINGFACE_API_KEY (o HF_TOKEN) y opcionalmente HUGGINGFACE_MODEL_ID en Railway.');
  }
  const maxTokens = opciones.max_tokens ?? 4096;
  const temperature = opciones.temperatura ?? 0.2;
  const body = {
    model: HF_MODEL,
    messages: normalizarMensajes(mensajes),
    max_tokens: maxTokens,
    temperature: Math.max(0, Math.min(2, temperature)),
  };
  let response;
  try {
    response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error('Error de red al llamar a Hugging Face: ' + (err?.message || err));
  }
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error('Respuesta no JSON de Hugging Face (status ' + response.status + ').');
  }
  if (!response.ok) {
    const msg = (data.error?.message || data.error || data.message || data).toString();
    throw new Error(msg || `HTTP ${response.status}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (content != null) return String(content).trim();
  throw new Error('Hugging Face no devolvió texto en choices[0].message.content.');
}

module.exports = {
  estaConfigurado,
  llamarHuggingFace,
  getModelId: () => HF_MODEL,
};
