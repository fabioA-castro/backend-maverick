# Backend Groq para Presupuestos Kontry

**Esta carpeta es la única del backend.** Aquí editas prompts, ejecutas el servidor y subes a GitHub. Así todo queda enlazado: app → esta carpeta → GitHub → servidor desplegado.

## Flujo (todo conjunto)

1. **Ejecuta el servidor desde esta carpeta** (Escritorio): así, cuando la app modifique un prompt (Editar prompts del backend), se guarda aquí.
2. **Sube a GitHub** desde aquí (GitHub Desktop: commit + push). GitHub tendrá los prompts actualizados.
3. **Despliegue** (Railway, Render): conecta el repo de GitHub a tu proyecto; al redesplegar, el servidor en la nube usará los prompts que subiste.

Si cambias un prompt en la app con el servidor local corriendo desde esta carpeta, el archivo se actualiza aquí; luego haz commit y push para que GitHub (y el servidor desplegado al redesplegar) tenga el cambio.

---

La **app Android no guarda la API Key**. Este backend la guarda y llama a Groq por ti.

```
App Android  →  POST tu-url.com/completar  →  Este servidor  →  Groq (con API Key)
```

## Contrato

- **POST** `/completar`
- **Body (una de las dos formas):**
  - **A)** `{ "prompt": "texto completo para la IA" }` — la app envía el prompt ya construido.
  - **B)** `{ "promptId": "generar_variantes", "datos": { "descripcion": "Muro de ladrillo..." } }` — el backend usa el **prompt maestro** (plantilla en `server.js`) y reemplaza `{{DESCRIPCION}}` con el valor.
- **Respuesta:** `{ "text": "respuesta de Groq" }` o `{ "error": "mensaje" }`

**Estructura del backend (escalable):**

- **`config.json`** — modelo Groq, temperatura, max_tokens, modo_desarrollo. El servidor lo lee al arrancar; no hace falta tocar código para cambiar configuración.
- **`prompts.json`** — todos los prompt maestros en un solo JSON: `{ "id": { "name": "...", "template": "..." } }`. Las ediciones desde la app (PUT /prompt-masters/:id) se guardan en este archivo y persisten al reiniciar el servidor.
- **`rutas/`** — endpoints: `completar.js`, `promptRutas.js`.
- **`controladores/`** — lógica: `completarControlador.js`, `promptControlador.js`.
- **`servicios/groqService.js`** — llamada a Groq; si cambias de modelo o proveedor, solo tocas aquí y `config.json`.
- **`data/promptsData.js`** — carga los prompts desde `prompts.json`, los mantiene en memoria y, al actualizar desde la app, escribe de nuevo en `prompts.json` para que no se pierdan al reiniciar.
- **`logs/`** — se guardan errores en `logs/errores.log` al fallar una llamada a Groq.

## Despliegue rápido

### 1. Obtén tu API Key de Groq

En [console.groq.com → Claves API](https://console.groq.com/keys) crea una clave. **No la pongas en la app.**

### 2. Railway (gratis para empezar)

1. Crea cuenta en [railway.app](https://railway.app).
2. “New Project” → “Deploy from GitHub” (sube esta carpeta a un repo) o “Empty Project” y conecta esta carpeta.
3. En el proyecto → **Variables** → añade `GROQ_API_KEY` = tu clave.
4. Deploy. Te dará una URL como `https://tu-app.up.railway.app`.
5. En la app Android: **Ajustes → URL del backend (Groq)** → `https://tu-app.up.railway.app/completar`.

### 3. Render (gratis)

1. Crea cuenta en [render.com](https://render.com).
2. “New” → “Web Service”. Conecta tu repo o sube este código.
3. **Build command:** (vacío o `npm install`)  
   **Start command:** `npm start`
4. En “Environment” añade `GROQ_API_KEY` = tu clave.
5. Deploy. URL tipo `https://tu-app.onrender.com`.
6. En la app: **URL del backend** = `https://tu-app.onrender.com/completar`.

### 4. Local (pruebas)

```bash
cd backend-groq-ejemplo
npm install
GROQ_API_KEY=gsk_tu_clave node server.js
```

Luego en la app usa `http://IP_DE_TU_PC:3000/completar` (misma red; en emulador Android a veces `http://10.0.2.2:3000/completar`).

## Seguridad

- La API Key solo existe en el servidor (variable de entorno).
- La app solo conoce la URL del backend.
- Si quieres limitar quién llama a tu backend, puedes añadir un token en el header y comprobarlo aquí.
