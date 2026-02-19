# Railway: dos backends (dos IAs) paso a paso

Así tendrás **dos URLs**: una con tu llave 1 y otra con tu llave 2. La app usará la segunda cuando la primera alcance el límite.

---

## Antes de empezar

- Tienes **dos API keys de Groq** (llave 1 y llave 2).
- El código del backend está en **`backend-maverick`** (este proyecto).
- Necesitas una cuenta en [Railway](https://railway.app) (puedes usar el plan gratuito).

---

## Paso 1: Subir el backend a GitHub (si aún no está)

1. Crea un repositorio en GitHub (ej. `presupuestos-kontry-backend`).
2. En la carpeta del backend (Escritorio):

   ```bash
   cd C:\Users\Usuario\Desktop\backend-maverick
   git init
   git add .
   git commit -m "Backend Groq para app"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/presupuestos-kontry-backend.git
   git push -u origin main
   ```

   (Sustituye `TU_USUARIO` por tu usuario de GitHub.)

Si ya tienes el repo y solo quieres actualizar:

```bash
cd C:\Users\Usuario\Desktop\backend-maverick
git add .
git commit -m "Actualizar backend"
git push
```

---

## Paso 2: Primer despliegue en Railway (Backend 1 – Llave 1)

1. Entra en **https://railway.app** e inicia sesión.
2. **New Project** (Nuevo proyecto).
3. Elige **Deploy from GitHub repo**.
4. Conecta tu cuenta de GitHub si te lo pide y selecciona el repositorio del backend (ej. `presupuestos-kontry-backend`).
5. Railway detectará `package.json` y desplegará con Node.js. Espera a que el primer deploy termine (Status: Success).
6. **Añadir la variable con la API key:**
   - Entra en el proyecto → clic en el **servicio** (el cuadro del backend).
   - Pestaña **Variables** (Variables).
   - **+ New Variable** (o **Add Variable**).
   - Nombre: `GROQ_API_KEY`
   - Valor: **tu primera API key de Groq** (la llave 1).
   - Guarda. Railway volverá a desplegar solo.
7. **Obtener la URL pública:**
   - En el mismo servicio, pestaña **Settings** (Configuración).
   - En **Networking** → **Generate Domain** (o **Public Networking** → añadir dominio).
   - Te dará una URL tipo: `https://presupuestos-kontry-backend-production-xxxx.up.railway.app`
8. **URL que usará la app:**  
   La ruta del endpoint es `/completar`, así que la URL completa es:
   ```
   https://TU-DOMINIO.up.railway.app/completar
   ```
   Anótala como **URL Backend 1**.

---

## Paso 3: Segundo despliegue en Railway (Backend 2 – Llave 2)

1. En Railway, en el **mismo proyecto** (o en el dashboard principal):
2. **New** → **GitHub Repo** (o **Empty Project** si prefieres).
3. Si eliges **mismo repo**:  
   - Crea un **nuevo servicio** en el mismo proyecto: **Add Service** → **GitHub Repo** → mismo repositorio.  
   - Así tendrás dos servicios en un solo proyecto: cada uno es un despliegue distinto.
4. O bien crea **New Project** y vuelve a elegir **Deploy from GitHub repo** con el **mismo repositorio**. Tendrás dos proyectos, cada uno con un despliegue.
5. En este **segundo** servicio/proyecto:
   - **Variables** → **+ New Variable**
   - Nombre: `GROQ_API_KEY`
   - Valor: **tu segunda API key de Groq** (llave 2).
   - Guarda.
6. **Settings** → **Networking** → **Generate Domain**.
7. Anota la URL de este segundo despliegue. La URL para la app será:
   ```
   https://TU-SEGUNDO-DOMINIO.up.railway.app/completar
   ```
   Anótala como **URL Backend 2**.

---

## Paso 4: Probar que responden

En el navegador o con Postman:

- `GET https://URL-BACKEND-1/completar` no es la ruta correcta (el backend usa POST). Mejor:
- `GET https://URL-BACKEND-1/` (sin `/completar`) → debería devolver algo como `{ "ok": true, "message": "Backend Groq...", "promptMasters": [...] }`.

Si eso responde, el backend está en marcha. Lo mismo para la URL del Backend 2.

---

## Paso 5: Configurar la app Android

1. Abre la app **Presupuestos Kontry**.
2. Ve a **Ajustes**.
3. **URL del backend (IA):** pega **URL Backend 1** (con `/completar` al final).
4. **URL backend 2 (reserva):** pega **URL Backend 2** (con `/completar` al final).
5. Guarda.

Al crear el árbol con IA, la app usará primero la URL 1; si esa clave llega al límite (TPD/RPM), usará automáticamente la URL 2.

---

## Resumen

| Qué              | Dónde                    | Valor                          |
|------------------|--------------------------|---------------------------------|
| Backend 1        | Railway – Servicio 1     | Repo GitHub + `GROQ_API_KEY` = Llave 1 |
| Backend 2        | Railway – Servicio 2     | Mismo repo + `GROQ_API_KEY` = Llave 2 |
| App – URL principal | Ajustes → URL del backend (IA) | `https://....railway.app/completar` (Backend 1) |
| App – URL reserva | Ajustes → URL backend 2   | `https://....railway.app/completar` (Backend 2) |

Si algo falla (ej. 500 al llamar a Groq), revisa en Railway la pestaña **Deployments** → **View Logs** y que en **Variables** esté bien puesta `GROQ_API_KEY` en cada servicio.
