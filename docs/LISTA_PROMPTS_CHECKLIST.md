# Lista de prompts: qué tenemos y qué faltaba

| Prompt (tu lista) | En backend | Nota |
|-------------------|------------|------|
| **generar_variantes** | ✅ `generar_variantes` | Nombres de variante desde descripción. |
| **crear_variante_completa** | ✅ `crear_variante_completa` | Variante con rendimiento y recursos (JSON). |
| **importar_bc3** | ✅ `importar_bc3` | Procesar contenido BC3: partidas, categorías, variantes base. |
| **crear_partida** | ✅ `crear_partida` | Partida desde cero sin rendimiento (básica). |
| **generar_recursos** | ✅ `generar_recursos` | Alias de sugerir recursos; mismo uso que `sugerir_recursos_partida`. |
| **generar_rendimiento** | ✅ `generar_rendimiento` | Estimar rendimiento según tipo de variante. |
| **crear_presupuesto** | ✅ `crear_presupuesto` | Presupuesto completo; mismo uso que `generar_presupuesto_completo`. |
| **presupuesto_por_tipo** | ✅ `presupuesto_por_tipo` | Estructura por tipo de obra; mismo uso que `generar_plan_presupuesto`. |
| **lista_materiales** | ✅ `lista_materiales` | Extraer lista de materiales de una variante. |
| **analisis_pu** | ✅ `analisis_pu` | Explicar análisis del precio unitario (sin precios). |
| **clasificar_partida** | ✅ `clasificar_partida` | Alias de asignar categoría/subcategoría; mismo que `clasificar_partida_catalogo`. |
| **subcategorias_por_categoria** | ✅ `subcategorias_por_categoria` | Crear subcategorías a partir de una categoría. |
| **generar_mediciones** | ✅ `generar_mediciones` | Sugerir mediciones típicas según tipo de obra. |
| **mejorar_descripcion** | ✅ `mejorar_descripcion` | Mejorar descripción para que sea profesional. |
| **crear_categorias** | ✅ `crear_categorias` | Generar categorías de obra. |
| **crear_subpartidas** | ✅ `crear_subpartidas` | Dividir partida en subpartidas o tareas. |
| **explicar_partida** | ✅ `explicar_partida` | Explicar técnicamente partida o variante. |
| **variantes_por_categoria** | ✅ `variantes_por_categoria` | Generar variantes típicas de una categoría. |
| **partidas_por_categoria** | ✅ `partidas_por_categoria` | Generar partidas típicas de una categoría. |
| **limpiar_texto** | ✅ `limpiar_texto` | Limpiar textos importados (BC3, PDF, OCR). |

Todos los de la lista están cubiertos. Los que eran “alias” comparten plantilla con el prompt principal indicado arriba.

Ver `prompts.json` y `docs/PROMPTS_APP.md` para datos a enviar en cada uno.
