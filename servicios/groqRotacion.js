/**
 * Rotación de llaves Groq (2 llaves): solo por cupo diario (TPD).
 * No se rota por límite por minuto (TPM): ante un pico de TPM se espera y se reintenta con la misma llave.
 * Solo cuando una llave agota su cupo del día (TPD) se cambia a la otra.
 *
 * Contadores: se actualizan en éxito (registrarLlamada) solo para GET /estado-groq. No disparan rotación.
 */
let llaveActiva = 1;
let llamadasLlave1 = 0;
let llamadasLlave2 = 0;
let rotacionesRealizadas = 0;
let ultimaRotacionAt = null;

const LIMITE_ROTACION = null; // Ya no se rota por número de llamadas; solo por TPD (cupo diario)

function getLlaveActiva() {
  return llaveActiva;
}

/** Se llama cuando una petición a Groq termina con éxito. Solo actualiza contadores para /estado-groq; no cambia de llave. */
function registrarLlamada() {
  if (llaveActiva === 1) {
    llamadasLlave1++;
  } else {
    llamadasLlave2++;
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
