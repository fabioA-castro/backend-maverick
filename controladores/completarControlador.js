/**
 * Lógica del endpoint POST /completar.
 * Acepta: { prompt } o { promptId, datos } (datos.descripcion o body.descripcion).
 */

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
    // Arbol BC3 devuelve JSON grande por chunk; más max_tokens reduce truncado ("Unterminated array")
    const maxTokens = (promptId === 'arbol_jerarquico_bc3')
      ? (config.groq?.max_tokens_arbol_bc3 ?? 8192)
      : (config.groq?.max_tokens ?? 4096);
    // Rotación por bloque en árbol BC3 (solo si no hay GROQ_LLAVE_SOLO_BC3): bloque 0→Llave 1, 1→2, … reparto entre numLlaves
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
          esArbolBC3: promptId === 'arbol_jerarquico_bc3',
        }
      : { modelo: modeloElegido, esArbolBC3: promptId === 'arbol_jerarquico_bc3' };

    if (promptId === 'arbol_jerarquico_bc3' && Number.isInteger(indiceBloque) && indiceBloque >= 0) {
      console.log(`[BC3] Bloque ${indiceBloque} - IA trabajando...`);
    }
    const text = await groqService.llamarGroq(
      [{ role: 'user', content: prompt }],
      opts
    );
    if (promptId === 'arbol_jerarquico_bc3' && Number.isInteger(indiceBloque) && indiceBloque >= 0) {
      console.log(`[BC3] Bloque ${indiceBloque} - IA terminó.`);
    }
    res.json({ text });
  } catch (e) {
    console.error(e);
    logError('completar:', e);
    res.status(500).json({ error: e.message || 'Error al llamar a Groq' });
  }
}

module.exports = { completar };
