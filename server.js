/**
 * Backend Presupuestos Kontry + Kimi.
 * POST /completar → prompt o promptId + datos (llama a Kimi).
 * GET /prompt-masters, GET/PUT /prompt-masters/:id
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./configLoader');
const promptsData = require('./data/promptsData');

const configPath = path.join(__dirname, 'config.json');
const promptsDir = path.join(__dirname, 'prompts');
if (!fs.existsSync(configPath)) console.warn('Aviso: config.json no encontrado; se usan valores por defecto.');
if (!fs.existsSync(promptsDir)) console.warn('Aviso: carpeta prompts/ no encontrada; se usará prompts.json si existe.');
const numPrompts = promptsData.getList().length;
console.log(`Config cargada. Prompts cargados: ${numPrompts}`);

const kimiService = require('./servicios/kimiService');
const numLlaves = kimiService.getNumLlaves ? kimiService.getNumLlaves() : 0;
console.log(`Llaves configuradas: ${numLlaves} (GROQ_API_KEY, GROQ_API_KEY_2, …). Modelo: ${kimiService.getModeloParaLlave(1) || 'moonshotai/kimi-k2-instruct-0905'}`);
if (numLlaves > 0) {
  const info = kimiService.getInfoLlaves();
  info.llaves.forEach(l => console.log(`  Llave ${l.numero} → modelo: ${l.modelo}`));
  const llavesBC3 = kimiService.getLlavesBC3 && kimiService.getLlavesBC3();
  if (llavesBC3 && llavesBC3.length > 0) {
    console.log(`Creación JSON/árbol BC3 → Llaves ${llavesBC3.join(', ')}`);
  }
}

try { fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true }); } catch (_) {}

const rutasCompletar = require('./rutas/completar');
const rutasPrompt = require('./rutas/promptRutas');

const app = express();
const bodyLimitMb = Math.min(50, Math.max(15, parseInt(process.env.BODY_LIMIT_MB || '25', 10) || 25));
app.use(express.json({ limit: `${bodyLimitMb}mb` }));

app.use('/', rutasCompletar);
app.use('/', rutasPrompt);

app.get('/', (req, res) => {
  const list = promptsData.getList().map(p => p.id);
  res.json({
    ok: true,
    message: 'Backend Kimi para Presupuestos Kontry. POST /completar; GET/PUT /prompt-masters.',
    promptMasters: list,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}. POST /completar (prompt o promptId+datos)`);
  if (config.modo_desarrollo) {
    console.log('Modo desarrollo activo.');
  }
});
