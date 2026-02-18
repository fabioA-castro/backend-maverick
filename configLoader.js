/**
 * Carga config.json una vez. El servidor y los controladores lo requieren aquí.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  groq: { modelo: 'openai/gpt-oss-120b', temperatura: 0.2, max_tokens: 1024 },
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

module.exports = config;
