/**
 * Carga y mantiene los prompt maestros en memoria.
 * prompts.json tiene formato: { "id": { "name": "...", "template": "..." } }
 * PUT desde la app actualiza en memoria y guarda en prompts.json (los cambios persisten al reiniciar).
 */

const fs = require('fs');
const path = require('path');

// prompts.json en la raíz del backend (mismo nivel que server.js)
const PROMPTS_FILE = path.join(__dirname, '..', 'prompts.json');

let promptsMap = {};
let namesMap = {};

function loadPrompts() {
  try {
    if (fs.existsSync(PROMPTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
      promptsMap = {};
      namesMap = {};
      for (const [id, val] of Object.entries(data)) {
        if (typeof val === 'string') {
          promptsMap[id] = val;
          namesMap[id] = id;
        } else if (val && typeof val.template === 'string') {
          promptsMap[id] = val.template;
          namesMap[id] = val.name || id;
        }
      }
    }
  } catch (e) {
    console.warn('No se pudo cargar prompts.json:', e.message);
  }
  return { promptsMap, namesMap };
}

function getPromptsMap() {
  return promptsMap;
}

function getNamesMap() {
  return namesMap;
}

function getList() {
  return Object.entries(promptsMap).map(([id, template]) => ({
    id,
    name: namesMap[id] || id,
    template,
  }));
}

function getOne(id) {
  if (!promptsMap[id]) return null;
  return { id, name: namesMap[id] || id, template: promptsMap[id] };
}

/**
 * Escribe en disco el estado actual de prompts (mismo formato que prompts.json).
 * Así las ediciones desde la app persisten al reiniciar o redesplegar.
 */
function savePromptsToFile() {
  try {
    const obj = {};
    for (const id of Object.keys(promptsMap)) {
      obj[id] = {
        name: namesMap[id] || id,
        template: promptsMap[id],
      };
    }
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('No se pudo guardar prompts.json:', e.message);
    return false;
  }
}

function updatePrompt(id, template) {
  if (!promptsMap[id]) return false;
  promptsMap[id] = template.trim();
  if (!savePromptsToFile()) {
    console.warn('Prompt actualizado en memoria pero no se pudo guardar en prompts.json');
  }
  return true;
}

function buildPromptFromMaster(promptId, datos) {
  let template = promptsMap[promptId];
  if (!template) return null;
  for (const [key, value] of Object.entries(datos || {})) {
    template = template.replace(
      new RegExp(`{{${key.toUpperCase()}}}`, 'g'),
      String(value ?? '')
    );
  }
  return template;
}

loadPrompts();

module.exports = {
  loadPrompts,
  getPromptsMap,
  getNamesMap,
  getList,
  getOne,
  updatePrompt,
  buildPromptFromMaster,
};
