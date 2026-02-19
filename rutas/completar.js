const express = require('express');
const { completar } = require('../controladores/completarControlador');
const { estadoGroq } = require('../controladores/estadoGroqControlador');

const router = express.Router();
router.post('/completar', completar);
router.get('/estado-groq', estadoGroq);

module.exports = router;
