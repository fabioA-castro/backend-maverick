/**
 * Servicio para llamar a la API de Moonshot (Kimi K2.5).
 * Variable de entorno: MOONSHOT_API_KEY (o CLAVE_DE_API_DE_MOONSHOT si Railway la guarda así)
 */

const MOONSHOT_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const MODELO_DEFECTO = "kimi-k2.5";

/** Obtiene la API key de Moonshot desde env (Railway puede mostrar "CLAVE DE API MOONSHOT" pero guardar con otro nombre). */
function getMoonshotApiKey() {
  return process.env.MOONSHOT_API_KEY?.trim()
    || process.env.CLAVE_DE_API_DE_MOONSHOT?.trim()
    || process.env.MOONSHOT_API_KEY_1?.trim()
    || "";
}

/**
 * Llama a Moonshot/Kimi con un prompt de texto.
 * @param {string} apiKey - API key (o null/undefined para usar getMoonshotApiKey())
 * @param {string} prompt - Texto del usuario
 * @param {object} opts - { max_tokens?: number, temperature?: number }
 * @returns {Promise<string>} - Contenido de la respuesta (choices[0].message.content)
 */
async function llamarMoonshot(apiKey, prompt, opts = {}) {
  const key = (apiKey || getMoonshotApiKey()).trim();
  if (!key) {
    throw new Error("MOONSHOT_API_KEY (o CLAVE_DE_API_DE_MOONSHOT) no configurada");
  }
  const response = await fetch(MOONSHOT_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || MODELO_DEFECTO,
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.max_tokens ?? 8192,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Moonshot ${response.status}: ${text.slice(0, 500)}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Moonshot: respuesta no JSON: ${text.slice(0, 200)}`);
  }

  const content = json.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error(`Moonshot: sin content en respuesta: ${text.slice(0, 300)}`);
  }
  return String(content).trim();
}

module.exports = {
  llamarMoonshot,
  getMoonshotApiKey,
  MOONSHOT_API_URL,
  MODELO_DEFECTO,
};
