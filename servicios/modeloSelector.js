/**
 * Selector de modelo Groq según la tarea.
 * - Árbol BC3: llama3-70b-8192 (estable, preciso, prompts largos).
 * - Variantes / tareas rápidas: mixtral-8x7b-32768 (rápido, validaciones).
 * - Análisis profundo (futuro): openai/gpt-oss-120b (muy capaz, más consumo).
 * - Por defecto: llama3-70b-8192.
 *
 * La variable de entorno GROQ_MODEL (o MODELO_DE_GROQ) sigue pudiendo forzar un modelo
 * global; si no está definida, se usa este selector por promptId.
 */
function seleccionarModelo(promptId, modeloPorDefecto) {
  const tarea = (promptId || '').toLowerCase();
  switch (tarea) {
    case 'arbol_jerarquico_bc3':
      return 'llama3-70b-8192';
    case 'generar_variantes':
      return 'mixtral-8x7b-32768';
    case 'resumen':
    case 'validar':
      return 'mixtral-8x7b-32768';
    case 'analisis_profundo':
      return 'openai/gpt-oss-120b';
    default:
      return modeloPorDefecto || 'openai/gpt-oss-120b';
  }
}

module.exports = { seleccionarModelo };
