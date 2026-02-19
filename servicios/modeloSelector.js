/**
 * Selector de modelo Groq según la tarea.
 * Modelo por defecto: openai/gpt-oss-120b (estable; con dos llaves no se cae).
 * Todas las tareas usan este modelo salvo que config o variable de entorno indique otro.
 */
const MODELO_POR_DEFECTO = 'openai/gpt-oss-120b';

function seleccionarModelo(promptId, modeloPorDefecto) {
  return modeloPorDefecto || MODELO_POR_DEFECTO;
}

module.exports = { seleccionarModelo };
