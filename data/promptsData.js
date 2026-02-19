/**
 * Carga y mantiene los prompt maestros desde la carpeta prompts/.
 * Cada prompt es un archivo: prompts/<id>.json con { "name": "...", "template": "..." }.
 * El id es el nombre del archivo sin extensión. PUT desde la app actualiza ese archivo.
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const PROMPTS_JSON_FALLBACK = path.join(__dirname, '..', 'prompts.json');

let promptsMap = {};
let namesMap = {};

function loadFromFolder() {
  const files = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const filePath = path.join(PROMPTS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && typeof data.template === 'string') {
        promptsMap[id] = data.template;
        namesMap[id] = data.name || id;
      }
    } catch (e) {
      console.warn(`No se pudo cargar prompts/${file}:`, e.message);
    }
  }
}

function loadFromJsonFallback(onlyMissing = false) {
  try {
    const data = JSON.parse(fs.readFileSync(PROMPTS_JSON_FALLBACK, 'utf8'));
    for (const [id, val] of Object.entries(data)) {
      if (onlyMissing && promptsMap[id]) continue;
      if (typeof val === 'string') {
        promptsMap[id] = val;
        namesMap[id] = id;
      } else if (val && typeof val.template === 'string') {
        promptsMap[id] = val.template;
        namesMap[id] = val.name || id;
      }
    }
    if (!onlyMissing) {
      console.warn('Prompts cargados desde prompts.json (fallback). Ejecuta node scripts/migrarPromptsACarpeta.js para usar la carpeta prompts/.');
    }
  } catch (e) {
    console.warn('No se pudo cargar prompts.json (fallback):', e.message);
  }
}

function loadPrompts() {
  promptsMap = {};
  namesMap = {};
  try {
    if (fs.existsSync(PROMPTS_DIR) && fs.statSync(PROMPTS_DIR).isDirectory()) {
      loadFromFolder();
    }
    if (fs.existsSync(PROMPTS_JSON_FALLBACK)) {
      loadFromJsonFallback(Object.keys(promptsMap).length > 0);
    }
    if (Object.keys(promptsMap).length === 0) {
      console.warn('Aviso: no hay prompts en prompts/ ni prompts.json; lista vacía.');
    }
  } catch (e) {
    console.warn('No se pudo cargar prompts:', e.message);
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
 * Actualiza el template de un prompt y guarda en prompts/<id>.json.
 * Si la carpeta no existe, se crea.
 */
function updatePrompt(id, template) {
  if (!promptsMap[id]) return false;
  const name = namesMap[id] || id;
  promptsMap[id] = template.trim();
  try {
    if (!fs.existsSync(PROMPTS_DIR)) {
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
    }
    const filePath = path.join(PROMPTS_DIR, `${id}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ name, template: promptsMap[id] }, null, 2),
      'utf8'
    );
    return true;
  } catch (e) {
    console.error(`No se pudo guardar prompts/${id}.json:`, e.message);
    return false;
  }
}

// Límite para BC3 en arbol_jerarquico_bc3: chunks más pequeños = menos tokens/petición → menos TPM (tokens/min). App envía ~3500; aquí 5000 por si llega más.
const MAX_BC3_CHARS_ARBOL = 5000;

function truncarBc3PorLinea(texto, maxChars) {
  if (typeof texto !== 'string' || texto.length <= maxChars) return texto;
  const chunk = texto.slice(0, maxChars);
  const lastNl = chunk.lastIndexOf('\n');
  return lastNl >= 0 ? texto.slice(0, lastNl + 1) : chunk;
}

function buildPromptFromMaster(promptId, datos) {
  let template = promptsMap[promptId];
  if (!template) return null;
  for (const [key, value] of Object.entries(datos || {})) {
    let val = String(value ?? '');
    if (promptId === 'arbol_jerarquico_bc3' && key.toUpperCase() === 'BC3_CONTENT' && val.length > MAX_BC3_CHARS_ARBOL) {
      val = truncarBc3PorLinea(val, MAX_BC3_CHARS_ARBOL);
      console.warn(`[promptsData] BC3_CONTENT truncado a ${val.length} caracteres (límite ${MAX_BC3_CHARS_ARBOL}) para arbol_jerarquico_bc3`);
    }
    template = template.replace(
      new RegExp(`{{${key.toUpperCase()}}}`, 'g'),
      val
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
