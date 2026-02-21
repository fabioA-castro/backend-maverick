/**
 * GET /llaves — lista de llaves Groq configuradas y cuáles están activas.
 * POST /llaves — activar solo ciertas llaves (body: { "solo_llaves": [4] }) o reset (body: { "reset": true }).
 * La app puede usar esto para "bloquear" o "activar" llaves desde Ajustes sin tocar Railway.
 */

const groqService = require('../servicios/groqService');

function getLlaves(req, res) {
  try {
    const info = groqService.getInfoLlaves();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al leer llaves' });
  }
}

function postLlaves(req, res) {
  try {
    const body = req.body || {};
    if (body.reset === true) {
      groqService.setLlavesActivas(null);
      return res.json({ ok: true, activas: null, mensaje: 'Se usan de nuevo todas las llaves configuradas.' });
    }
    const solo = body.solo_llaves || body.activas;
    if (Array.isArray(solo) && solo.length > 0) {
      const numeros = solo.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 4);
      groqService.setLlavesActivas(numeros.length ? numeros : null);
      const info = groqService.getInfoLlaves();
      return res.json({ ok: true, activas: info.activas, mensaje: 'Llaves actualizadas.' });
    }
    res.status(400).json({ error: 'Envía { "solo_llaves": [1,2,3,4] } o { "activas": [4] } para activar solo esas; { "reset": true } para usar todas.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al guardar llaves' });
  }
}

module.exports = { getLlaves, postLlaves };
