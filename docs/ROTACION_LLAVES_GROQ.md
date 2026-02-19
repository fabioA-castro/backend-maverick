# Rotación de llaves Groq

En esta carpeta (backend-maverick) está todo lo de rotación de llaves. Nada de esto vive en el proyecto Android.

## Archivos

- **`servicios/groqRotacion.js`** — Llave activa (1 o 2), contadores por llave, cambio al 80% del límite o al fallar. Al rotar, la llave que descansa resetea su contador.
- **`servicios/groqService.js`** — Usa `groqRotacion`: para cada petición usa la llave activa; si falla, `cambiarLlave()` y reintenta con la otra; si ok, `registrarLlamada()` (puede provocar cambio al 80%).

## Variables de entorno

Puedes configurar **hasta 4 llaves** (más llaves = más cupo repartido):

- **Llave 1** → `CLAVE_API_GROQ_2` o `GROQ_API_KEY_2` (o `CLAVE_DE_API_DE_GROQ_2`).
- **Llave 2** → `GROQ_API_KEY` o `CLAVE DE API DE GROQ` (nombre con espacios, como en Railway).
- **Llave 3** (opcional) → `GROQ_MODELO_1` o `GROQ_API_KEY_3`.
- **Llave 4** (opcional) → `GROQ_API_KEY_4`.

**Tiempo de espera entre llaves** (opcional) → `GROQ_ESPERA_ENTRE_LLAVES` = segundos antes de probar otra llave tras un fallo (por defecto 20).

**Una llave solo para BC3** (opcional) → `GROQ_LLAVE_SOLO_BC3` = 1, 2, 3 o 4. Esa llave se usa **únicamente** para "Crear árbol con IA" (árbol jerárquico BC3). El resto de peticiones (variantes, otros prompts) usan solo las otras llaves. Así una cuenta puede dedicarse solo a descargar el BC3 completo sin compartir cupo con el resto de la app.

Con 2 llaves: rotación al 95% (29 llamadas) o al fallar; con 3 o 4 llaves: reparto por bloque en árbol BC3 (bloque % N) y round-robin en el resto de peticiones.

## Cómo saber si hubo rotación

- **GET /estado-groq** — Devuelve el estado actual: `llaveActiva` (1 o 2), `llamadasLlave1`, `llamadasLlave2`, `rotacionesRealizadas`, `ultimaRotacion` (ISO), `limiteRotacion`. La app Android en Ajustes → "Estado de rotación Groq" llama a esta URL (base del backend + `/estado-groq`) para mostrarlo.

## Comportamiento

- Evita llegar al 100%: cambia al llegar a `LIMITE_ROTACION` (p. ej. 24 = 80% de 30 RPM).
- Si una llave falla (rate limit, error), se cambia a la otra y se reintenta.
- La llave que descansa resetea su contador al volver a activa.
