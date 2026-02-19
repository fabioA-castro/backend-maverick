# Rotación de llaves Groq

En esta carpeta (backend-maverick) está todo lo de rotación de llaves. Nada de esto vive en el proyecto Android.

## Archivos

- **`servicios/groqRotacion.js`** — Llave activa (1 o 2), contadores por llave, cambio al 80% del límite o al fallar. Al rotar, la llave que descansa resetea su contador.
- **`servicios/groqService.js`** — Usa `groqRotacion`: para cada petición usa la llave activa; si falla, `cambiarLlave()` y reintenta con la otra; si ok, `registrarLlamada()` (puede provocar cambio al 80%).

## Variables de entorno

- `GROQ_API_KEY` → llave 1  
- `GROQ_API_KEY_2` (o `CLAVE_DE_API_DE_GROQ_2`) → llave 2  

El orden lo define el código: la primera variable = llave 1, la segunda = llave 2.

## Comportamiento

- Evita llegar al 100%: cambia al llegar a `LIMITE_ROTACION` (p. ej. 24 = 80% de 30 RPM).
- Si una llave falla (rate limit, error), se cambia a la otra y se reintenta.
- La llave que descansa resetea su contador al volver a activa.
