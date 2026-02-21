/**
 * Lógica del endpoint POST /completar.
 * Acepta: { prompt } o { promptId, datos } (datos.descripcion o body.descripcion).
 *
 * Peticiones BC3 (árbol + JSON por bloques) → solo llaves 2 y 4 (GROQ_LLAVE_SOLO_BC3=2,4).
 * Resto (variantes, etc.) → llaves 1 y 3.
 */
const PROMPT_IDS_BC3 = new Set([
  'arbol_jerarquico_bc3',
  'bc3_json_bloque_inicio',
  'bc3_json_bloque_intermedio',
  'bc3_json_bloque_final',
  'bc3_a_json_estructurado',
]);

function esPeticionBC3(promptId) {
  return !!promptId && PROMPT_IDS_BC3.has(promptId);
}

const fs = require('fs');
const path = require('path');
const groqService = require('../servicios/groqService');
const promptsData = require('../data/promptsData');
const config = require('../configLoader');
const { seleccionarModelo } = require('../servicios/modeloSelector');

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
    const promptId = req.body?.promptId || null;
    const datos = req.body?.datos || {};
    const modeloElegido = seleccionarModelo(promptId, config.groq?.modelo);
    const esBC3 = esPeticionBC3(promptId);
    // Peticiones BC3 (árbol + JSON por bloques): más max_tokens para evitar truncado ("Unterminated array")
    const maxTokens = esBC3
      ? (config.groq?.max_tokens_arbol_bc3 ?? 8192)
      : (config.groq?.max_tokens ?? 4096);
    const numLlaves = groqService.getNumLlaves ? groqService.getNumLlaves() : 2;
    const indiceBloque = datos.INDICE_BLOQUE != null ? parseInt(datos.INDICE_BLOQUE, 10) : null;
    const llaveForzada = (promptId === 'arbol_jerarquico_bc3' && Number.isInteger(indiceBloque) && indiceBloque >= 0 && numLlaves >= 2)
      ? ((indiceBloque % numLlaves) + 1)
      : null;
    const opts = config.groq
      ? {
          modelo: modeloElegido,
          temperatura: config.groq.temperatura,
          max_tokens: maxTokens,
          llaveForzada: llaveForzada || undefined,
          esArbolBC3: esBC3,
        }
      : { modelo: modeloElegido, esArbolBC3: esBC3 };

    if (esBC3 && promptId) {
      console.log(`[BC3] ${promptId}${Number.isInteger(indiceBloque) ? ` bloque ${indiceBloque}` : ''} - IA trabajando...`);
    }
    const text = await groqService.llamarGroq(
      [{ role: 'user', content: prompt }],
      opts
    );
    if (esBC3 && promptId) {
      console.log(`[BC3] ${promptId}${Number.isInteger(indiceBloque) ? ` bloque ${indiceBloque}` : ''} - IA terminó.`);
    }
    res.json({ text });
  } catch (e) {
    console.error(e);
    logError('completar:', e);
    res.status(500).json({ error: e.message || 'Error al llamar a Groq' });
  }
}

module.exports = { completar };
