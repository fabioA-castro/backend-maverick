# Backend Groq para Presupuestos Kontry

La **app Android no guarda la API Key**. Este backend la guarda y llama a Groq por ti.

```
App Android  →  POST tu-url.com/completar  →  Este servidor  →  Groq (con API Key)
```

## Contrato

- **POST** ` /completar`  
- **Body:** `{ "prompt": "texto para la IA" }`  
- **Respuesta:** `{ "text": "respuesta de Groq" }` o `{ "error": "mensaje" }`

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
