# Revisión de variables en Railway (Editor sin procesar)

Usa esta lista en **Variables → Editor sin procesar** del servicio **backend-maverick** para que todo use **groq/compound** y no meta-llama.

---

## 1. Modelo global (obligatorio)

| Variable      | Valor que debe tener      | Comentario |
|---------------|---------------------------|------------|
| `GROQ_MODEL`  | `groq/compound`           | Modelo por defecto para todas las llaves. Si falta, se usa el de config.json. |
| o `MODELO_DE_GROQ` | `groq/compound`     | Alternativa a GROQ_MODEL. |

**Revisar:** que no diga `meta-llama`, `llama-4-scout`, ni `openai/gpt-oss-120b` si quieres usar solo compound.

---

## 2. Llaves API (las que uses)

| Variable          | Uso                         |
|-------------------|-----------------------------|
| `CLAVE_API_GROQ_2` o `GROQ_API_KEY_2` | Llave 1 (API key que empieza por gsk_...) |
| `GROQ_API_KEY`    | Llave 2                     |
| `GROQ_MODELO_1` o `GROQ_API_KEY_3` | Llave 3 (cuidado: GROQ_MODELO_1 aquí es la **API key**, no el nombre del modelo) |
| `GROQ_API_KEY_4`  | Llave 4                     |

**Revisar:** que los valores sean **claves** (gsk_...), no nombres de modelo.

---

## 3. Modelo por llave (opcional)

Si quieres una llave solo para BC3 con compound:

| Variable        | Valor recomendado   | Efecto |
|-----------------|---------------------|--------|
| `GROQ_MODEL_1`  | `groq/compound`     | Llave 1 = compound; el backend la usará para creación JSON/árbol BC3. |

Si **no** pones `GROQ_MODEL_1`, `GROQ_MODEL_2`, `GROQ_MODEL_3`, `GROQ_MODEL_4`, todas las llaves usan el modelo de `GROQ_MODEL` (groq/compound).

**Revisar:** que **ninguna** de estas tenga otro modelo distinto de compound (si quieres usar solo compound):

- `GROQ_MODEL_1`
- `GROQ_MODEL_2`
- `GROQ_MODEL_3`
- `GROQ_MODEL_4`
- `GROQ_MODEL_LLAVE_1` … `GROQ_MODEL_LLAVE_4`

Si alguna tiene `meta-llama`, `llama-4-scout` o `openai/gpt-oss-120b`, **bórrala** o cámbiala a `groq/compound`. Con el código actual, si `GROQ_MODEL=groq/compound`, el backend usa **siempre** compound en todas las llaves y ignora el valor por llave; aun así, es más claro no tener variables que apunten a otros modelos.

---

## 4. Qué llave es cada variable (orden en el backend)

| Número llave | Variables en Railway (nombre de la API key) |
|--------------|---------------------------------------------|
| **Llave 1**  | `CLAVE_API_GROQ_2` o `GROQ_API_KEY_2`       |
| **Llave 2**  | **`GROQ_API_KEY`** o "CLAVE DE API DE GROQ" ← esta es la que sueles ver en la consola |
| **Llave 3**  | `GROQ_MODELO_1` o `GROQ_API_KEY_3`         |
| **Llave 4**  | `GROQ_API_KEY_4`                           |

**Crear JSON / árbol BC3:** el backend usa la llave que tenga `groq/compound` (por `GROQ_MODEL_1` etc.) o la que indiques con `GROQ_LLAVE_SOLO_BC3`. Si quieres que **solo** la llave **GROQ_API_KEY** (Llave 2) se use para crear JSON y árbol BC3, añade en Railway:

- **`GROQ_LLAVE_SOLO_BC3=2`**

Así la Llave 2 (GROQ_API_KEY) se usará solo para BC3; las otras llaves (1 y 3) para el resto de peticiones.

## 5. Límites de tamaño (si ves "la entidad de solicitud es demasiado grande")

| Variable               | Valor por defecto | Uso |
|------------------------|-------------------|-----|
| `BODY_LIMIT_MB`        | `25`              | Límite en MB del body que acepta el backend (POST /completar). Si la app envía bloques BC3 muy grandes, sube a 30–50. |
| `GROQ_MAX_BODY_BYTES`  | `900000` (~900 KB)| Tamaño máximo del body que enviamos a Groq. Si Groq devuelve 413, reduce el tamaño del bloque en la app (p. ej. `MAX_BC3_CHARS_ARBOL_LLM`) o sube este valor (máx. 2MB). |

## 6. Otras (opcionales)

| Variable              | Uso |
|-----------------------|-----|
| `GROQ_LLAVE_SOLO_BC3` | Número de llave (1–4) que se usa **solo** para JSON/árbol BC3. Ej.: `2` para usar solo GROQ_API_KEY en BC3. |
| `MOONSHOT_API_KEY`    | Ya no se usa (Kimi quitado del backend). Puedes borrarla. |

---

## 7. Checklist rápida

- [ ] `GROQ_MODEL=groq/compound` (o `MODELO_DE_GROQ=groq/compound`).
- [ ] No existe `GROQ_MODEL_1`, `_2`, `_3` o `_4` con valor `meta-llama` ni `llama-4-scout`.
- [ ] Las variables de llaves (`CLAVE_API_GROQ_2`, `GROQ_API_KEY`, `GROQ_MODELO_1`, etc.) tienen claves `gsk_...`, no nombres de modelo.
- [ ] (Opcional) `GROQ_MODEL_1=groq/compound` si quieres que la Llave 1 sea explícitamente compound para BC3.
- [ ] (Opcional) `GROQ_LLAVE_SOLO_BC3=2` si quieres que **solo** la llave GROQ_API_KEY (Llave 2) se use para crear JSON/árbol BC3.

Tras cambiar variables, **Actualizar variables** y, si hace falta, **redesplegar** el servicio.
