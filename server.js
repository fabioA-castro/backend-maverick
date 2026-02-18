/**
 * Backend Presupuestos Kontry + Groq.
 * Configuración en config.json; prompts en prompts.json; rutas y controladores separados.
 *
 * POST /completar  → prompt completo o promptId + datos
 * GET /prompt-masters, GET/PUT /prompt-masters/:id  → listar y editar prompts desde la app
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./configLoader');
const promptsData = require('./data/promptsData');

// Comprobar que lo esencial está cargado (sin tirar el servidor)
const configPath = path.join(__dirname, 'config.json');
const promptsPath = path.join(__dirname, 'prompts.json');
if (!fs.existsSync(configPath)) console.warn('Aviso: config.json no encontrado; se usan valores por defecto.');
if (!fs.existsSync(promptsPath)) console.warn('Aviso: prompts.json no encontrado; lista de prompts vacía.');
const numPrompts = promptsData.getList().length;
console.log(`Config cargada. Prompts cargados: ${numPrompts}`);

try { fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true }); } catch (_) {}

const rutasCompletar = require('./rutas/completar');
const rutasPrompt = require('./rutas/promptRutas');

const app = express();
app.use(express.json());

// Montar rutas
app.use('/', rutasCompletar);
app.use('/', rutasPrompt);

// Health check
app.get('/', (req, res) => {
  const list = promptsData.getList().map(p => p.id);
  res.json({
    ok: true,
    message: 'Backend Groq para Presupuestos Kontry. POST /completar; GET/PUT /prompt-masters.',
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
