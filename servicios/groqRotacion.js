/**
 * Rotación de llaves Groq: llave 1 = GROQ_API_KEY, llave 2 = GROQ_API_KEY_2.
 * Cambia al 95% del límite (29 de 30 RPM) o al fallar. La llave que descansa resetea su contador.
 *
 * Cómo arrancan y se cuentan las llamadas:
 * - Al arrancar el servidor: llaveActiva = 1, llamadasLlave1 = 0, llamadasLlave2 = 0.
 * - Solo se cuenta una llamada cuando la petición a Groq tiene éxito (registrarLlamada() se llama en groqService solo tras respuesta OK).
 * - Cuando una llave pasa a activa, su contador ya está en 0 (se puso a 0 al salir de activa la última vez). Al cambiar de llave se resetea la que deja de usarse, no la que entra.
 */
let llaveActiva = 1;
let llamadasLlave1 = 0;
let llamadasLlave2 = 0;
let rotacionesRealizadas = 0;
let ultimaRotacionAt = null;

const LIMITE_ROTACION = 29; // 95% de 30 RPM; con dos llaves no hace falta dejar tanto margen

function getLlaveActiva() {
  return llaveActiva;
}

/** Se llama solo cuando una petición a Groq termina con éxito. Suma 1 al contador de la llave activa; si llega a LIMITE_ROTACION, cambia de llave. */
function registrarLlamada() {
  if (llaveActiva === 1) {
    llamadasLlave1++;
    if (llamadasLlave1 >= LIMITE_ROTACION) cambiarLlave();
  } else {
    llamadasLlave2++;
    if (llamadasLlave2 >= LIMITE_ROTACION) cambiarLlave();
  }
}

/** Cambia la llave activa (1↔2) y pone a 0 el contador de la llave que deja de usarse. La que entra ya tenía 0 desde la última vez que salió. */
function cambiarLlave() {
  llaveActiva = llaveActiva === 1 ? 2 : 1;
  rotacionesRealizadas++;
  ultimaRotacionAt = new Date().toISOString();
  console.log('[Groq] Cambiando a la llave', llaveActiva, '| Rotaciones en esta sesión:', rotacionesRealizadas);
  if (llaveActiva === 1) {
    llamadasLlave2 = 0;
  } else {
    llamadasLlave1 = 0;
  }
}

/** Estado actual para GET /estado-groq (saber si hubo rotación y qué llave está activa). */
function getEstadoRotacion() {
  return {
    llaveActiva,
    llamadasLlave1,
    llamadasLlave2,
    rotacionesRealizadas,
    ultimaRotacion: ultimaRotacionAt || null,
    limiteRotacion: LIMITE_ROTACION,
  };
}

module.exports = {
  getLlaveActiva,
  cambiarLlave,
  registrarLlamada,
  getEstadoRotacion,
};
