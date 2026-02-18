# Prompts del backend – Uso desde la app

La app llama a **POST /completar** con `promptId` y `datos`. El backend sustituye en la plantilla cada `{{CLAVE}}` por `datos.clave` (la clave se pasa en mayúsculas en la plantilla).

## Lista de promptId y datos

| promptId | Uso | Datos (claves en `datos`) |
|----------|-----|---------------------------|
| **generar_variantes** | Nombres cortos de variante desde descripción | `descripcion` |
| **generar_partida** | Una partida completa en JSON (materiales, mano de obra, maquinaria) | `descripcion` (opcional: `perfil_variante`, `instrucciones` si se añaden al final del texto) |
| **sugerir_recursos_partida** | Sugerir recursos para partida BC3 genérica | `codigo_partida`, `nombre_partida`, `descripcion_partida`, `recursos_actuales` (texto, ej. "Ninguno" o "Recurso A (MATERIAL, m²); Recurso B (MANO_OBRA, h)") |
| **generar_plan_presupuesto** | Plan de presupuesto: partidas + cantidades, sin precios | `descripcion_proyecto` |
| **generar_presupuesto_completo** | Presupuesto completo con precios y total | `descripcion_proyecto` |
| **clasificar_partida_catalogo** | ¿Duplicado o nueva? Si nueva: código + 4 niveles | `partida_bc3` (texto bloque: código, descripción, unidad, recursos, nivel, ruta), `catalogo_actual` (lista texto: id \| codigoInterno \| descripción \| n1 > n2 > n3 > n4) |
| **generar_codigo_niveles_catalogo** | Código interno + 4 niveles para partida nueva (sin comparar duplicados) | `partida_bc3`, `niveles_ref` (lista de códigos y niveles ya existentes) |
| **recursos_para_completar_partida** | Códigos de recursos de la partida nueva que hay que añadir a la partida del catálogo | `descripcion_partida`, `recursos_en_base`, `recursos_nueva` (texto de listas) |
| **verificar_importes** | Análisis de anomalías e importes del presupuesto | `datos_presupuesto` (bloque: total calculado, nº items, TOP items, TOP recursos, info validación) |
| **normalizar_texto_bc3** | Normalizar/resumir texto técnico BC3 | `texto` |
| **extraer_unidad_descripcion** | Unidad de medida desde descripción | `descripcion` |
| **crear_variante_completa** | Variante completa con rendimiento y recursos (JSON) | `descripcion` |
| **importar_bc3** | Procesar contenido BC3: partidas, categorías, variantes base | `contenido_bc3` |
| **crear_partida** | Partida básica desde cero (sin rendimiento) | `descripcion` |
| **generar_recursos** | Sugerir recursos para una variante (alias de sugerir_recursos) | `codigo_partida`, `nombre_partida`, `descripcion_partida`, `recursos_actuales` |
| **generar_rendimiento** | Estimar rendimiento según tipo de variante | `descripcion` |
| **crear_presupuesto** | Presupuesto completo (alias) | `descripcion_proyecto` |
| **presupuesto_por_tipo** | Estructura de presupuesto por tipo de obra | `tipo_obra` |
| **lista_materiales** | Extraer materiales de una variante | `descripcion` |
| **analisis_pu** | Explicar análisis del precio unitario (sin precios) | `descripcion` |
| **clasificar_partida** | Asignar categoría/subcategoría (alias de clasificar_partida_catalogo) | `partida_bc3`, `catalogo_actual` |
| **subcategorias_por_categoria** | Crear subcategorías según categoría | `categoria` |
| **generar_mediciones** | Sugerir mediciones típicas según tipo de obra | `tipo_obra` |
| **mejorar_descripcion** | Mejorar descripción para que sea profesional | `texto` |
| **crear_categorias** | Generar categorías de obra | `contexto` (opcional) |
| **crear_subpartidas** | Dividir partida en subpartidas o tareas | `descripcion` |
| **explicar_partida** | Explicar técnicamente partida o variante | `descripcion` |
| **variantes_por_categoria** | Generar variantes típicas de una categoría | `categoria` |
| **partidas_por_categoria** | Generar partidas típicas de una categoría | `categoria` |
| **limpiar_texto** | Limpiar textos importados (BC3, PDF, OCR) | `texto` |

## Ejemplo desde la app (Kotlin)

```kotlin
// Nombres de variante (ya lo usáis)
llm.completarConPlantilla("generar_variantes", mapOf("descripcion" to descripcionCorta))

// Generar una partida completa
llm.completarConPlantilla("generar_partida", mapOf("descripcion" to "Alicatado de pared con azulejo 20x20, mortero C2TE"))

// Sugerir recursos para una partida
llm.completarConPlantilla("sugerir_recursos_partida", mapOf(
    "codigo_partida" to "D080501",
    "nombre_partida" to "Alicatado",
    "descripcion_partida" to descripcion,
    "recursos_actuales" to recursosStr
))

// Plan de presupuesto (sin precios)
llm.completarConPlantilla("generar_plan_presupuesto", mapOf("descripcion_proyecto" to descripcionProyecto))

// Presupuesto completo
llm.completarConPlantilla("generar_presupuesto_completo", mapOf("descripcion_proyecto" to descripcionProyecto))

// Clasificar partida en catálogo
llm.completarConPlantilla("clasificar_partida_catalogo", mapOf(
    "partida_bc3" to partidaBloque,
    "catalogo_actual" to catalogosStr
))

// Verificar importes
llm.completarConPlantilla("verificar_importes", mapOf("datos_presupuesto" to bloqueDatos))
```

## Flujo recomendado en la app

1. **Importe BC3** → parser en app; opcional: `normalizar_texto_bc3`, `extraer_unidad_descripcion`.
2. **Crear variantes del árbol** → `generar_variantes` (nombres); `generar_partida` (partida completa por variante).
3. **Catálogo** → `clasificar_partida_catalogo` o `generar_codigo_niveles_catalogo`; `recursos_para_completar_partida` si es duplicado.
4. **Recursos** → `sugerir_recursos_partida` para partidas genéricas.
5. **Presupuestos** → `generar_plan_presupuesto` (índice) y luego `generar_partida` por partida; o `generar_presupuesto_completo` (todo en uno).
6. **Cálculo / verificación** → `verificar_importes` con los datos del presupuesto.

Todos estos prompts están en `prompts.json` y se pueden editar desde la app (Editar prompts del backend) o en el repositorio.

## Propósito del botón = un solo prompt

En la app no hay reglas sobre "usar prompts en varias pantallas". La única regla es: **si un botón es para "crear nombre de variante", ese botón llama a un solo prompt**. Si en otra pantalla el botón es también "crear nombre de variante", es el mismo prompt (un botón solo para ese prompt).

| Propósito del botón | promptId |
|---------------------|----------|
| Crear nombre de variante | **generar_variantes** |
| Qué detecta la IA (material, característica, medida) | **detectar_material_caracteristica_medida** |

Los `promptId` y el texto local (cuando no hay backend) están en `ConfiguracionPromptsApp.kt`.
