const express = require('express');
const { listar, obtenerUno, actualizar } = require('../controladores/promptControlador');

const router = express.Router();
router.get('/prompt-masters', listar);
router.get('/prompt-masters/:id', obtenerUno);
router.put('/prompt-masters/:id', actualizar);

module.exports = router;
