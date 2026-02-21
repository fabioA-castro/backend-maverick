# Modelo distinto por llave (Groq)

Cada llave puede usar un **modelo distinto**. Así puedes asignar tareas:

- **BC3 (Crear JSON):** muchos tokens por respuesta → usa un modelo con **TPM alto** (p. ej. `groq/compuesto`, 70K TPM). Con bloques más grandes haces **menos peticiones** y no te comes las 250 RPD de compuesto.
- **Otras tareas (variantes, ajustes, etc.):** muchas llamadas al día → usa un modelo con **RPD alto** (p. ej. `moonshotai/kimi-k2-instruct-0905`: 1000 RPD, 60 RPM).

## Variables de entorno (Railway)

| Variable | Uso |
|----------|-----|
| `GROQ_MODEL_1` | Modelo para Llave 1 (CLAVE_API_GROQ_2) |
| `GROQ_MODEL_2` | Modelo para Llave 2 (GROQ_API_KEY) |
| `GROQ_MODEL_3` | Modelo para Llave 3 (GROQ_MODELO_1) |
| `GROQ_MODEL_4` | Modelo para Llave 4 (GROQ_API_KEY_4) |

Opcional: `GROQ_MODEL_LLAVE_1`, `GROQ_MODEL_LLAVE_2`, etc.

Si no defines modelo para una llave, se usa el modelo por defecto (`GROQ_MODEL` o `openai/gpt-oss-120b`).

## Ejemplo: BC3 con compuesto, resto con Kimi

- **Llave 1** solo para árbol BC3 (variable `GROQ_LLAVE_SOLO_BC3=1`):
  - `GROQ_MODEL_1=groq/compuesto`  
  - Compuesto: 70K TPM, 250 RPD. Con bloques grandes son pocas peticiones por BC3.
- **Llaves 2 y 3** para el resto (variantes, etc.):
  - `GROQ_MODEL_2=moonshotai/kimi-k2-instruct-0905`
  - `GROQ_MODEL_3=moonshotai/kimi-k2-instruct-0905`  
  - Kimi (en Groq): 60 RPM, 1000 RPD, 10K TPM, 300K TPD.

Así la llave 1 se dedica a BC3 (muchos tokens por respuesta) y las otras a muchas llamadas (Kimi).

## Límites (plan gratuito Groq, resumen)

| Modelo | RPM | RPD | TPM | TPD |
|--------|-----|-----|-----|-----|
| groq/compuesto | 30 | 250 | 70 000 | — |
| moonshotai/kimi-k2-instruct-0905 | 60 | 1 000 | 10 000 | 300 000 |
| openai/gpt-oss-120b | 30 | 1 000 | 8 000 | 200 000 |
