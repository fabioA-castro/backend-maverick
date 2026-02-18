/**
 * Migra prompts.json a la carpeta prompts/: un archivo por prompt.
 * Uso: node scripts/migrarPromptsACarpeta.js
 * Crea prompts/<id>.json con { "name": "...", "template": "..." }.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROMPTS_JSON = path.join(ROOT, 'prompts.json');
const PROMPTS_DIR = path.join(ROOT, 'prompts');

function main() {
  if (!fs.existsSync(PROMPTS_JSON)) {
    console.error('No se encuentra prompts.json en la raíz del backend.');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(PROMPTS_JSON, 'utf8'));
  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }
  let count = 0;
  for (const [id, val] of Object.entries(data)) {
    const name = (val && val.name) ? val.name : id;
    const template = typeof val === 'string' ? val : (val && val.template) ? val.template : '';
    if (!template) continue;
    const filePath = path.join(PROMPTS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ name, template }, null, 2), 'utf8');
    count++;
    console.log('Creado:', filePath);
  }
  console.log(`\nMigrados ${count} prompts a ${PROMPTS_DIR}`);
}

main();
