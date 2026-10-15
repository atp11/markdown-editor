import { renderMarkdown } from './markdown'

const DOCUMENT_STYLES = `
  :root {
    --text: #1a1f24;
    --muted: #5a6570;
    --border: #d5dbe3;
    --code-bg: #f0f3f7;
    --link: #0b6e4f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    max-width: 820px;
    padding: 2.5rem 1.5rem 4rem;
    font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--text);
    background: #fff;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: "Source Serif 4", Georgia, serif;
    line-height: 1.25;
    margin: 1.6em 0 0.55em;
  }
  h1 { font-size: 2.1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35em; }
  h2 { font-size: 1.55rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  h3 { font-size: 1.25rem; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 1rem; }
  a { color: var(--link); }
  code {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 0.9em;
    background: var(--code-bg);
    padding: 0.12em 0.35em;
    border-radius: 4px;
  }
  pre {
    background: var(--code-bg);
    padding: 1rem 1.1rem;
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 4px solid var(--link);
    margin-left: 0;
    padding: 0.25rem 0 0.25rem 1rem;
    color: var(--muted);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  th { background: var(--code-bg); }
  img { max-width: 100%; height: auto; }
  .header-anchor { text-decoration: none; color: var(--muted); margin-right: 0.35em; }
  .mermaid { background: #fff; text-align: center; padding: 1rem; }
  @media print {
    body { max-width: none; padding: 0; }
    a { text-decoration: none; color: inherit; }
    .header-anchor { display: none; }
    pre, table { break-inside: avoid; }
  }
`

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadMarkdown(source: string, filename = 'documento.md'): void {
  downloadBlob(new Blob([source], { type: 'text/markdown;charset=utf-8' }), filename)
}

function buildStandaloneHtml(source: string, title: string, mermaidSvgs: string[]): string {
  const bodyHtml = renderMarkdown(source)

  // Replace mermaid pre blocks with already-rendered SVGs when available
  let html = bodyHtml
  let svgIndex = 0
  html = html.replace(/<div class="mermaid">[\s\S]*?<\/div>/g, () => {
    const svg = mermaidSvgs[svgIndex++]
    return svg ? `<div class="mermaid">${svg}</div>` : ''
  })

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeAttr(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" rel="stylesheet" />
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
${html}
</body>
</html>`
}

function escapeAttr(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

/** Collect SVG outerHTML from rendered mermaid diagrams in the preview. */
export function collectMermaidSvgs(previewRoot: HTMLElement): string[] {
  return Array.from(previewRoot.querySelectorAll('.mermaid')).map((el) => {
    const svg = el.querySelector('svg')
    return svg ? svg.outerHTML : el.innerHTML
  })
}

export function downloadHtml(
  source: string,
  previewRoot: HTMLElement,
  filename = 'documento.html',
): void {
  const title = extractTitle(source) || 'Documento'
  const html = buildStandaloneHtml(source, title, collectMermaidSvgs(previewRoot))
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), filename)
}

/**
 * Export to PDF via the browser print dialog.
 * Mermaid diagrams are embedded as already-rendered SVGs.
 */
export function exportPdf(source: string, previewRoot: HTMLElement): void {
  const title = extractTitle(source) || 'Documento'
  const html = buildStandaloneHtml(source, title, collectMermaidSvgs(previewRoot))
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    window.alert('No se pudo abrir la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.document.title = title

  const triggerPrint = () => {
    win.focus()
    win.print()
  }

  // Wait for fonts/images briefly, then print
  if (win.document.fonts?.ready) {
    win.document.fonts.ready.then(() => setTimeout(triggerPrint, 150))
  } else {
    setTimeout(triggerPrint, 300)
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function extractTitle(source: string): string | null {
  const match = /^#\s+(.+)$/m.exec(source)
  return match ? match[1].trim() : null
}
