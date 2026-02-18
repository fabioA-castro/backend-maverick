/**
 * Lógica de los endpoints de prompt maestros: listar, obtener uno, actualizar.
 */

const promptsData = require('../data/promptsData');

function listar(req, res) {
  const list = promptsData.getList();
  res.json({ list });
}

function obtenerUno(req, res) {
  const id = req.params.id;
  const one = promptsData.getOne(id);
  if (!one) return res.status(404).json({ error: 'Prompt no encontrado' });
  res.json(one);
}

function actualizar(req, res) {
  const id = req.params.id;
  const template = req.body?.template;
  if (typeof template !== 'string' || !template.trim()) {
    return res.status(400).json({ error: 'Body debe tener "template" (texto del prompt)' });
  }
  if (!promptsData.updatePrompt(id, template)) {
    return res.status(404).json({ error: 'Prompt no encontrado' });
  }
  const updated = promptsData.getOne(id);
  res.json({ id: updated.id, template: updated.template });
}

module.exports = { listar, obtenerUno, actualizar };
