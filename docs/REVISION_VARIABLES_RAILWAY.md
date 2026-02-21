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

**Revisar:** que **ninguna** de estas tenga `meta-llama` ni `llama-4-scout`:

- `GROQ_MODEL_1`
- `GROQ_MODEL_2`
- `GROQ_MODEL_3`
- `GROQ_MODEL_4`
- `GROQ_MODEL_LLAVE_1` … `GROQ_MODEL_LLAVE_4`

Si alguna tiene meta-llama, **bórrala** o cámbiala a `groq/compound`. Con el código actual, si `GROQ_MODEL=groq/compound`, el backend ignora meta-llama en esas llaves, pero es más claro no tenerlas.

---

## 4. Otras (opcionales)

| Variable              | Uso |
|-----------------------|-----|
| `GROQ_LLAVE_SOLO_BC3` | Si quieres fijar qué llave (1–4) se usa solo para BC3. Si pones `GROQ_MODEL_1=groq/compound`, no hace falta. |
| `MOONSHOT_API_KEY`    | Ya no se usa (Kimi quitado del backend). Puedes borrarla. |

---

## 5. Checklist rápida

- [ ] `GROQ_MODEL=groq/compound` (o `MODELO_DE_GROQ=groq/compound`).
- [ ] No existe `GROQ_MODEL_1`, `_2`, `_3` o `_4` con valor `meta-llama` ni `llama-4-scout`.
- [ ] Las variables de llaves (`CLAVE_API_GROQ_2`, `GROQ_API_KEY`, `GROQ_MODELO_1`, etc.) tienen claves `gsk_...`, no nombres de modelo.
- [ ] (Opcional) `GROQ_MODEL_1=groq/compound` si quieres que la Llave 1 sea explícitamente compound para BC3.

Tras cambiar variables, **Actualizar variables** y, si hace falta, **redesplegar** el servicio.
