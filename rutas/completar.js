const express = require('express');
const { completar } = require('../controladores/completarControlador');

const router = express.Router();
router.post('/completar', completar);

module.exports = router;
