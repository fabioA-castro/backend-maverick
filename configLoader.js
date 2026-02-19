/**
 * Carga config.json una vez. El servidor y los controladores lo requieren aquí.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  groq: { modelo: 'meta-llama/llama-4-maverick-17b-128e-instruct', temperatura: 0.2, max_tokens: 1024 },
  modo_desarrollo: false,
};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (loaded.groq && typeof loaded.groq === 'object') {
      config.groq = { ...config.groq, ...loaded.groq };
    }
    if (typeof loaded.modo_desarrollo === 'boolean') config.modo_desarrollo = loaded.modo_desarrollo;
  }
} catch (e) {
  console.warn('No se pudo cargar config.json:', e.message);
}

// Railway/entorno: forzar modelo desde variable (GROQ_MODEL o MODELO_DE_GROQ)
const modeloEnv = (process.env.GROQ_MODEL || process.env.MODELO_DE_GROQ || '').trim();
if (modeloEnv) {
  config.groq.modelo = modeloEnv;
  console.log('Groq modelo desde variable de entorno:', config.groq.modelo);
}

module.exports = config;
