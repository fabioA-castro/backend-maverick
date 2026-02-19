/**
 * GET /estado-groq — estado de rotación de llaves Groq (para saber si hubo rotación y qué llave está activa).
 */

const { getEstadoRotacion } = require('../servicios/groqRotacion');

function estadoGroq(req, res) {
  try {
    const estado = getEstadoRotacion();
    res.json(estado);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al leer estado Groq' });
  }
}

module.exports = { estadoGroq };
