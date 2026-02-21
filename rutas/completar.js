const express = require('express');
const { completar } = require('../controladores/completarControlador');
const { estadoGroq } = require('../controladores/estadoGroqControlador');
const { getLlaves, postLlaves } = require('../controladores/llavesControlador');

const router = express.Router();
router.post('/completar', completar);
router.get('/estado-groq', estadoGroq);
router.get('/llaves', getLlaves);
router.post('/llaves', postLlaves);

module.exports = router;
