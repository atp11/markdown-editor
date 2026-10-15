export const SAMPLE_MARKDOWN = `# Markdown Editor

Editor de Markdown **en el navegador**: vista previa en vivo, tablas, diagramas Mermaid, índice automático y exportación.

> Nada se guarda en el servidor ni en el navegador. Copia el texto o exporta antes de cerrar la pestaña.

## Características

- Vista previa en tiempo real
- Tablas GFM
- Diagramas [Mermaid](https://mermaid.js.org/)
- Generación de índice (TOC)
- Exportar a \`.md\`, HTML y PDF

## Tabla de ejemplo

| Función        | Atajo / acción      | Estado |
| -------------- | ------------------- | ------ |
| Negrita        | Toolbar / \`** **\` | ✅     |
| Vista previa   | Automática          | ✅     |
| Exportar PDF   | Menú Exportar       | ✅     |

## Diagrama Mermaid

\`\`\`mermaid
flowchart LR
  A[Escribir Markdown] --> B[Vista previa]
  B --> C{¿Listo?}
  C -->|Sí| D[Exportar]
  C -->|No| A
  D --> E[.md / HTML / PDF]
\`\`\`

## Código

\`\`\`ts
function greet(name: string) {
  return \`Hola, \${name}!\`
}
\`\`\`

---

Usa **Insertar índice** en la barra de herramientas para generar un TOC a partir de los encabezados.
`
