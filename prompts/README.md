# Prompts del backend

Cada archivo `.txt` en esta carpeta es un **prompt maestro**. El nombre del archivo (sin `.txt`) es el **id** que usa la app.

- `generar_variantes.txt` → la app envía `promptId: "generar_variantes"` y el backend usa este texto.
- Usa placeholders en mayúsculas: `{{DESCRIPCION}}`, `{{CONTEXTO}}`, etc. El backend los reemplaza con los datos que envíe la app.

Para **añadir un nuevo prompt**: crea un archivo nuevo, por ejemplo `crear_partida.txt`, con el texto del prompt. Tras desplegar, la app podrá usarlo con `promptId: "crear_partida"`.

Para **cambiar un prompt**: edita el `.txt`, guarda y vuelve a desplegar en Railway. No hace falta tocar `server.js`.
