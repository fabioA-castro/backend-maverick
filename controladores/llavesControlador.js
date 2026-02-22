/**
 * GET /llaves — lista de llaves Kimi configuradas, cuáles están activas y si hay llave fijada para BC3.
 * POST /llaves — activar llaves, o fijar/liberar llave para tarea BC3:
 *   { "activas": [1,4] } | { "reset": true } | { "solo_bc3_por_tarea": 2 } | { "solo_bc3_por_tarea": null }
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
      kimiService.setLlaveBC3PorTarea(null);
      return res.json({ ok: true, activas: null, solo_bc3_por_tarea: null, mensaje: 'Se usan de nuevo todas las llaves configuradas.' });
    }
    if (body.solo_bc3_por_tarea !== undefined) {
      const n = body.solo_bc3_por_tarea;
      if (n === null || n === undefined) {
        kimiService.setLlaveBC3PorTarea(null);
        const info = kimiService.getInfoLlaves();
        return res.json({ ok: true, solo_bc3_por_tarea: null, mensaje: 'Llave BC3 liberada.' });
      }
      const num = parseInt(n, 10);
      if (num < 1 || num > 5) {
        return res.status(400).json({ error: 'solo_bc3_por_tarea debe ser 1, 2, 3, 4 o 5.' });
      }
      const info = kimiService.getInfoLlaves();
      const activas = info.activas || [];
      if (!activas.includes(num)) {
        return res.status(400).json({ error: `La llave ${num} no está activa. Actívala en Ajustes primero.` });
      }
      const configurada = (info.llaves || []).some(l => l.numero === num);
      if (!configurada) {
        return res.status(400).json({ error: `La llave ${num} no está configurada en el backend.` });
      }
      kimiService.setLlaveBC3PorTarea(num);
      return res.json({ ok: true, solo_bc3_por_tarea: num, mensaje: `Llave ${num} fijada para la tarea BC3.` });
    }
    const solo = body.solo_llaves || body.activas;
    if (Array.isArray(solo)) {
      const numeros = solo.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 5);
      if (numeros.length === 0) {
        return res.status(400).json({ error: 'Debe haber al menos una llave activa. No se pueden desactivar todas.' });
      }
      kimiService.setLlavesActivas(numeros);
      const info = kimiService.getInfoLlaves();
      return res.json({ ok: true, activas: info.activas, solo_bc3_por_tarea: info.solo_bc3_por_tarea, mensaje: 'Llaves actualizadas.' });
    }
    res.status(400).json({ error: 'Envía { "activas": [1,4] }, { "solo_bc3_por_tarea": 2 } o { "reset": true }.' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al guardar llaves' });
  }
}

module.exports = { getLlaves, postLlaves };
