/**
 * Lógica del endpoint POST /completar.
 * Acepta: { prompt } o { promptId, datos } (datos.descripcion o body.descripcion).
 */

const fs = require('fs');
const path = require('path');
const groqService = require('../servicios/groqService');
const promptsData = require('../data/promptsData');
const config = require('../configLoader');

function logError(mensaje, err) {
  try {
    const logPath = path.join(__dirname, '..', 'logs', 'errores.log');
    const linea = `[${new Date().toISOString()}] ${mensaje} ${err?.message || err}\n`;
    fs.appendFileSync(logPath, linea);
  } catch (_) {}
}

async function completar(req, res) {
  let prompt = req.body?.prompt;
  if (typeof prompt === 'string' && prompt.trim()) {
    // A) Prompt completo
  } else if (req.body?.promptId) {
    const promptId = req.body.promptId;
    const datos = req.body.datos || { descripcion: req.body.descripcion };
    prompt = promptsData.buildPromptFromMaster(promptId, datos);
    if (!prompt) {
      return res.status(400).json({ error: `promptId desconocido: ${promptId}` });
    }
  }

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Envía "prompt" (texto completo) o "promptId" + "datos" (o "descripcion")' });
  }

  try {
    const opts = config.groq ? {
      modelo: config.groq.modelo,
      temperatura: config.groq.temperatura,
      max_tokens: config.groq.max_tokens,
    } : {};
    const text = await groqService.llamarGroq(
      [{ role: 'user', content: prompt }],
      opts
    );
    res.json({ text });
  } catch (e) {
    console.error(e);
    logError('completar:', e);
    res.status(500).json({ error: e.message || 'Error al llamar a Groq' });
  }
}

module.exports = { completar };
