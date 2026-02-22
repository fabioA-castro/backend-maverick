# Usar tu llave de Hugging Face en Railway

Puedes usar una API key de Hugging Face (Llama 4 Maverick, Scout, Qwen, Mixtral, etc.) en el mismo backend.

## 1. Variables en Railway

En tu proyecto de Railway, añade estas variables de entorno:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `HUGGINGFACE_API_KEY` | Tu token de Hugging Face (empieza por `hf_...`) | `hf_xxxxxxxxxxxx` |
| `HUGGINGFACE_MODEL_ID` | ID del modelo que quieres usar | `meta-llama/Llama-4-Maverick-17B-128E-Instruct` |

Opcional:

| Variable | Descripción |
|----------|-------------|
| `HUGGINGFACE_API_URL` | URL base si usas otro endpoint (por defecto `https://api-inference.huggingface.co`) |
| `HF_LLAVE_5_NOMBRE` | Nombre que verás en la app para la llave 5 (ej. "Llama Maverick"). Si no lo pones, se muestra "Hugging Face". |

## 2. Dónde guardar la API key

- **En Railway**: en el panel del proyecto → Variables → añade `HUGGINGFACE_API_KEY` y `HUGGINGFACE_MODEL_ID`. No las pongas en el código.
- **En local (Windows)**: puedes usar PowerShell:
  ```powershell
  $env:HUGGINGFACE_API_KEY = "hf_tu_token"
  $env:HUGGINGFACE_MODEL_ID = "meta-llama/Llama-4-Maverick-17B-128E-Instruct"
  ```
  Luego reinicia la terminal o el servidor.

## 3. Cómo se usa en el backend

- **Respaldo**: Si las llaves de Groq/Kimi fallan (límite, error, etc.), el backend intenta llamar a Hugging Face con tu modelo. La app no tiene que cambiar nada.
- **Forzar Hugging Face**: Si en el futuro la app envía `provider: "huggingface"` en el body de POST `/completar`, el backend usará solo Hugging Face para esa petición.

## 4. Modelos que puedes usar

Algunos ejemplos de `HUGGINGFACE_MODEL_ID`:

- Llama 4 Maverick: `meta-llama/Llama-4-Maverick-17B-128E-Instruct`
- Llama 4 Scout: (busca el ID exacto en huggingface.co/models)
- Llama 3.1: `meta-llama/Meta-Llama-3.1-8B-Instruct`
- Qwen: `Qwen/Qwen2.5-7B-Instruct`
- Mixtral: `mistralai/Mixtral-8x7B-Instruct-v0.1`

Comprueba en [huggingface.co/models](https://huggingface.co/models) el ID del modelo que quieras y que esté disponible en la Inference API.
