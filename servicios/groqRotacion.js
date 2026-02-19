/**
 * Rotación de llaves Groq: llave 1 = GROQ_API_KEY, llave 2 = GROQ_API_KEY_2.
 * Cambia al 80% del límite o al fallar. La llave que descansa resetea su contador.
 */
let llaveActiva = 1;
let llamadasLlave1 = 0;
let llamadasLlave2 = 0;

const LIMITE_ROTACION = 24; // 80% de 30 RPM; ajustar si tu límite es otro (ej. 80 si es 100)

function getLlaveActiva() {
  return llaveActiva;
}

function registrarLlamada() {
  if (llaveActiva === 1) {
    llamadasLlave1++;
    if (llamadasLlave1 >= LIMITE_ROTACION) cambiarLlave();
  } else {
    llamadasLlave2++;
    if (llamadasLlave2 >= LIMITE_ROTACION) cambiarLlave();
  }
}

function cambiarLlave() {
  llaveActiva = llaveActiva === 1 ? 2 : 1;
  console.log('[Groq] Cambiando a la llave', llaveActiva);
  if (llaveActiva === 1) {
    llamadasLlave2 = 0;
  } else {
    llamadasLlave1 = 0;
  }
}

module.exports = {
  getLlaveActiva,
  cambiarLlave,
  registrarLlamada,
};
