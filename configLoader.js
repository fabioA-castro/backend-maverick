/**
 * Carga config.json una vez. El servidor y los controladores lo requieren aquí.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  kimi: {
    modelo: process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct-0905',
    temperatura: 0.2,
    max_tokens: 4096,
    max_tokens_arbol_bc3: 8192,
  },
  modo_desarrollo: false,
};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (loaded.kimi && typeof loaded.kimi === 'object') {
      config.kimi = { ...config.kimi, ...loaded.kimi };
    }
    if (typeof loaded.modo_desarrollo === 'boolean') config.modo_desarrollo = loaded.modo_desarrollo;
  }
} catch (e) {
  console.warn('No se pudo cargar config.json:', e.message);
}

const modeloEnv = (process.env.KIMI_MODEL || '').trim();
if (modeloEnv) {
  config.kimi.modelo = modeloEnv;
  console.log('Kimi modelo desde variable de entorno:', config.kimi.modelo);
}

module.exports = config;
