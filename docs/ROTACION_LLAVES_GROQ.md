# Rotación de llaves Groq

En esta carpeta (backend-maverick) está todo lo de rotación de llaves. Nada de esto vive en el proyecto Android.

## Archivos

- **`servicios/groqRotacion.js`** — Llave activa (1 o 2), contadores por llave, cambio al 80% del límite o al fallar. Al rotar, la llave que descansa resetea su contador.
- **`servicios/groqService.js`** — Usa `groqRotacion`: para cada petición usa la llave activa; si falla, `cambiarLlave()` y reintenta con la otra; si ok, `registrarLlamada()` (puede provocar cambio al 80%).

## Variables de entorno

- **Llave 1** (cuenta principal / nueva) → `CLAVE_API_GROQ_2` o `GROQ_API_KEY_2` (o `CLAVE_DE_API_DE_GROQ_2`) — la que tiene "clave" en el nombre.
- **Llave 2** (cuenta reserva / antigua) → `GROQ_API_KEY` — sin "clave" en el nombre.
- **Tiempo de espera entre llaves** (opcional) → `GROQ_ESPERA_ENTRE_LLAVES` = segundos que el backend espera antes de probar la otra llave tras un fallo (por defecto 20). Así el TPM de la llave que acabamos de dejar tiene tiempo a reiniciarse y no se queman las dos en el mismo minuto.

El backend acepta cualquiera de esos nombres para la segunda variable; así puedes usar `CLAVE_API_GROQ_2` en el editor de variables y se usará como llave 1 (cuenta nueva).

## Cómo saber si hubo rotación

- **GET /estado-groq** — Devuelve el estado actual: `llaveActiva` (1 o 2), `llamadasLlave1`, `llamadasLlave2`, `rotacionesRealizadas`, `ultimaRotacion` (ISO), `limiteRotacion`. La app Android en Ajustes → "Estado de rotación Groq" llama a esta URL (base del backend + `/estado-groq`) para mostrarlo.

## Comportamiento

- Evita llegar al 100%: cambia al llegar a `LIMITE_ROTACION` (p. ej. 24 = 80% de 30 RPM).
- Si una llave falla (rate limit, error), se cambia a la otra y se reintenta.
- La llave que descansa resetea su contador al volver a activa.
