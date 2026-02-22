/**
 * Lógica del endpoint POST /completar.
 * Acepta: { prompt } o { promptId, datos }. El backend llama a Kimi.
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
const kimiService = require('../servicios/kimiService');
const huggingFaceService = require('../servicios/huggingFaceService');
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
    const promptId = req.body?.promptId || null;
    const datos = req.body?.datos || {};
    const modelo = config.kimi?.modelo || process.env.KIMI_MODEL || 'moonshotai/kimi-k2-instruct-0905';
    const esBC3 = esPeticionBC3(promptId);
    const maxTokens = esBC3
      ? (config.kimi?.max_tokens_arbol_bc3 ?? 8192)
      : (config.kimi?.max_tokens ?? 4096);
    const opts = {
      modelo,
      temperatura: config.kimi?.temperatura ?? 0.2,
      max_tokens: maxTokens,
      esArbolBC3: esBC3,
    };

    if (esBC3 && promptId) {
      console.log(`[BC3] ${promptId}${datos.INDICE_BLOQUE != null ? ` bloque ${datos.INDICE_BLOQUE}` : ''} - IA trabajando...`);
    }
    const mensajes = [{ role: 'user', content: prompt }];
    let text;
    const usarHuggingFace = req.body?.provider === 'huggingface' && huggingFaceService.estaConfigurado();
    if (usarHuggingFace) {
      text = await huggingFaceService.llamarHuggingFace(mensajes, {
        max_tokens: opts.max_tokens,
        temperatura: opts.temperatura,
      });
    } else {
      try {
        text = await kimiService.llamarKimi(mensajes, opts);
      } catch (e) {
        if (huggingFaceService.estaConfigurado()) {
          console.log('Kimi/Groq falló, intentando Hugging Face como respaldo:', e?.message);
          text = await huggingFaceService.llamarHuggingFace(mensajes, {
            max_tokens: opts.max_tokens,
            temperatura: opts.temperatura,
          });
        } else {
          throw e;
        }
      }
    }
    if (esBC3 && promptId) {
      console.log(`[BC3] ${promptId}${datos.INDICE_BLOQUE != null ? ` bloque ${datos.INDICE_BLOQUE}` : ''} - IA terminó.`);
    }
    res.json({ text });
  } catch (e) {
    console.error(e);
    logError('completar:', e);
    res.status(500).json({ error: e.message || 'Error al llamar a la IA' });
  }
}

module.exports = { completar };
