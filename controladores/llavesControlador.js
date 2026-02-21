/**
 * GET /llaves — lista de llaves Kimi configuradas y cuáles están activas.
 * POST /llaves — activar solo ciertas llaves (body: { "activas": [1,4] }) o { "reset": true }.
 */
const kimiService = require('../servicios/kimiService');

function getLlaves(req, res) {
  try {
    const info = kimiService.getInfoLlaves();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al leer llaves' });
  }
}

function postLlaves(req, res) {
  try {
    const body = req.body || {};
    if (body.reset === true) {
      kimiService.setLlavesActivas(null);
      return res.json({ ok: true, activas: null, mensaje: 'Se usan de nuevo todas las llaves configuradas.' });
    }
    const solo = body.solo_llaves || body.activas;
    if (Array.isArray(solo)) {
      const numeros = solo.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 4);
      if (numeros.length === 0) {
        return res.status(400).json({ error: 'Debe haber al menos una llave activa. No se pueden desactivar todas.' });
      }
      kimiService.setLlavesActivas(numeros);
      const info = kimiService.getInfoLlaves();
      return res.json({ ok: true, activas: info.activas, mensaje: 'Llaves actualizadas.' });
    }
    res.status(400).json({ error: 'Envía { "activas": [1,4] } para activar solo esas; { "reset": true } para usar todas.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al guardar llaves' });
  }
}

module.exports = { getLlaves, postLlaves };
