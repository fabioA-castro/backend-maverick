/**
 * GET /estado-groq — estado de llaves (compatibilidad con la app). Devuelve numLlaves desde Kimi.
 */
const { getNumLlaves } = require('../servicios/kimiService');

function estadoGroq(req, res) {
  try {
    const numLlaves = getNumLlaves();
    res.json({ numLlaves, llaveActiva: 1 });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al leer estado' });
  }
}

module.exports = { estadoGroq };
