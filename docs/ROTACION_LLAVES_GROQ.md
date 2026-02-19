# Rotación de llaves Groq

En esta carpeta (backend-maverick) está todo lo de rotación de llaves. Nada de esto vive en el proyecto Android.

## Archivos

- **`servicios/groqService.js`** — Con 2, 3 o 4 llaves: **round-robin** (reparto por turno). El día se reparte entre las N llaves. Si una falla por TPD, se prueba la siguiente; si falla por TPM, se espera y se reintenta con la misma llave.
- **`servicios/groqRotacion.js`** — Solo para GET /estado-groq (contadores/estado legacy); la elección de llave la hace groqService en round-robin.

## Variables de entorno

Puedes configurar **hasta 4 llaves** (más llaves = más cupo repartido):

- **Llave 1** → `CLAVE_API_GROQ_2` o `GROQ_API_KEY_2` (o `CLAVE_DE_API_DE_GROQ_2`).
- **Llave 2** → `GROQ_API_KEY` o `CLAVE DE API DE GROQ` (nombre con espacios, como en Railway).
- **Llave 3** (opcional) → `GROQ_MODELO_1` o `GROQ_API_KEY_3`.
- **Llave 4** (opcional) → `GROQ_API_KEY_4`.

**Tiempo de espera entre llaves** (opcional) → `GROQ_ESPERA_ENTRE_LLAVES` = segundos antes de probar otra llave tras un fallo (por defecto 20).

**Una llave solo para BC3** (opcional) → `GROQ_LLAVE_SOLO_BC3` = 1, 2, 3 o 4. Esa llave se usa **únicamente** para "Crear árbol con IA" (árbol jerárquico BC3). El resto de peticiones (variantes, otros prompts) usan solo las otras llaves. Así una cuenta puede dedicarse solo a descargar el BC3 completo sin compartir cupo con el resto de la app.

Con 2, 3 o 4 llaves: **reparto por turno (round-robin)**. El día se reparte entre las llaves que tengas: petición 1 → llave 1, 2 → llave 2, 3 → llave 3 (o 1 si son 2), etc. Si una llave agota cupo diario (TPD), se prueba la siguiente; ante TPM se espera y se reintenta con la misma llave. Árbol BC3 con 2+ llaves: reparto por bloque (bloque % N).

## Cómo saber si hubo rotación

- **GET /estado-groq** — Devuelve el estado actual: `llaveActiva` (1 o 2), `llamadasLlave1`, `llamadasLlave2`, `rotacionesRealizadas`, `ultimaRotacion` (ISO), `limiteRotacion`. La app Android en Ajustes → "Estado de rotación Groq" llama a esta URL (base del backend + `/estado-groq`) para mostrarlo.

## Comportamiento (2, 3 o 4 llaves)

- **Reparto por turno (round-robin):** cada petición usa la siguiente llave (1 → 2 → 3 → 1… o 1 → 2 → 1… si son 2). El día queda repartido entre las que tengas.
- **TPD (cupo diario agotado):** se prueba la siguiente llave en el orden.
- **TPM (límite por minuto):** se espera y se reintenta con la **misma** llave; no se cambia por un pico.
- GET /estado-groq devuelve `numLlaves` (2, 3 o 4) para mostrar “Reparto entre N llaves”.
