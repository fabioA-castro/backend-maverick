# Prompts del backend – un archivo por prompt

Cada prompt es un **archivo independiente** en esta carpeta.

- **Nombre del archivo (sin .json)** = **id** del prompt (ej. `generar_variantes`).
- **Contenido del archivo** = JSON con `name` (nombre para mostrar) y `template` (texto del prompt con placeholders `{{CLAVE}}`).

## Formato de cada archivo

`<id>.json`:

```json
{
  "name": "Nombre para mostrar en la app",
  "template": "Texto del prompt. Usa {{PARTIDA_ORIGINAL}}, {{DESCRIPCION_VARIANTE}}, etc. El backend sustituye con los datos que envía la app."
}
```

## Cómo añadir un prompt

1. Crea un archivo nuevo, por ejemplo `mi_prompt.json`.
2. El **id** será `mi_prompt` (nombre del archivo sin `.json`).
3. La app podrá usarlo con `promptId: "mi_prompt"` y los datos que defina el prompt.

## Cómo editar un prompt

- Edita el `.json` correspondiente (campo `template` y, si quieres, `name`), guarda y redespliega.
- O edita desde la app (Editar prompts del backend): se guarda en este mismo archivo.

## Migrar desde prompts.json

Si aún tienes un único `prompts.json` en la raíz del backend, ejecuta una vez:

```bash
node scripts/migrarPromptsACarpeta.js
```

Eso crea un `<id>.json` por cada prompt en esta carpeta. Luego puedes borrar o conservar `prompts.json` como copia.
