/**
 * Carga config.json una vez. El servidor y los controladores lo requieren aquí.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {
  groq: {
    modelo: 'openai/gpt-oss-120b',
    temperatura: 0.2,
    max_tokens: 4096,
    max_tokens_arbol_bc3: 4096, // limita tokens de salida por petición para no disparar el TPM (límite 8K/min); la app recupera JSON truncado
  },
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

// Railway/entorno: forzar modelo desde variable (GROQ_MODEL, GROQ_MODELO o MODELO_DE_GROQ)
const modeloEnv = (process.env.GROQ_MODEL || process.env.GROQ_MODELO || process.env.MODELO_DE_GROQ || '').trim();
if (modeloEnv) {
  // groq/compuesto (español) = groq/compound
  config.groq.modelo = modeloEnv.replace(/^groq\/compuesto$/i, 'groq/compound');
  console.log('Groq modelo desde variable de entorno:', config.groq.modelo);
}

module.exports = config;
