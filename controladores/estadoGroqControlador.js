/**
 * GET /estado-groq — estado de rotación de llaves Groq (para saber si hubo rotación y qué llave está activa).
 * Si hay 3 o 4 llaves, se añade numLlaves (rotación por bloque y round-robin).
 */

const { getEstadoRotacion } = require('../servicios/groqRotacion');
const { getNumLlaves } = require('../servicios/groqService');

function estadoGroq(req, res) {
  try {
    const estado = getEstadoRotacion();
    const n = getNumLlaves();
    if (n >= 2) estado.numLlaves = n;
    res.json(estado);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Error al leer estado Groq' });
  }
}

module.exports = { estadoGroq };
