import './style.css'
import { createEditor, type EditorHandle } from './editor'
import { updatePreview } from './preview'
import { extractHeadings, buildTocMarkdown } from './markdown'
import {
  copyToClipboard,
  downloadHtml,
  downloadMarkdown,
  exportPdf,
} from './export'
import { SAMPLE_MARKDOWN } from './sample'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <div class="brand-text">
          <h1>Markdown Editor</h1>
          <p class="tagline">Sin almacenamiento · Copia o exporta tu trabajo</p>
        </div>
      </div>
      <div class="topbar-actions">
        <button type="button" class="btn btn-ghost" data-action="copy" title="Copiar Markdown">
          Copiar
        </button>
        <div class="menu">
          <button type="button" class="btn btn-secondary" data-action="export-toggle" aria-expanded="false" aria-haspopup="true">
            Exportar ▾
          </button>
          <div class="menu-panel" role="menu" hidden>
            <button type="button" role="menuitem" data-action="export-md">Descargar .md</button>
            <button type="button" role="menuitem" data-action="export-html">Descargar HTML</button>
            <button type="button" role="menuitem" data-action="export-pdf">Exportar PDF…</button>
          </div>
        </div>
      </div>
    </header>

    <div class="toolbar" role="toolbar" aria-label="Formato Markdown">
      <button type="button" class="tool" data-fmt="h1" title="Título H1">H1</button>
      <button type="button" class="tool" data-fmt="h2" title="Título H2">H2</button>
      <button type="button" class="tool" data-fmt="h3" title="Título H3">H3</button>
      <span class="tool-sep" aria-hidden="true"></span>
      <button type="button" class="tool" data-fmt="bold" title="Negrita"><strong>B</strong></button>
      <button type="button" class="tool" data-fmt="italic" title="Cursiva"><em>I</em></button>
      <button type="button" class="tool" data-fmt="code" title="Código inline"><code>&lt;/&gt;</code></button>
      <button type="button" class="tool" data-fmt="link" title="Enlace">Link</button>
      <span class="tool-sep" aria-hidden="true"></span>
      <button type="button" class="tool" data-fmt="ul" title="Lista">• Lista</button>
      <button type="button" class="tool" data-fmt="ol" title="Lista numerada">1. Lista</button>
      <button type="button" class="tool" data-fmt="quote" title="Cita">“ Cita</button>
      <button type="button" class="tool" data-fmt="table" title="Insertar tabla">Tabla</button>
      <button type="button" class="tool" data-fmt="mermaid" title="Insertar diagrama Mermaid">Mermaid</button>
      <button type="button" class="tool" data-fmt="toc" title="Insertar índice">Índice</button>
      <span class="tool-sep" aria-hidden="true"></span>
      <button type="button" class="tool" data-fmt="sample" title="Cargar ejemplo">Ejemplo</button>
      <div class="toolbar-spacer"></div>
      <div class="view-toggle" role="group" aria-label="Vista">
        <button type="button" class="tool is-active" data-view="split" title="Editor y vista previa">Dividida</button>
        <button type="button" class="tool" data-view="editor" title="Solo editor">Editor</button>
        <button type="button" class="tool" data-view="preview" title="Solo vista previa">Vista previa</button>
      </div>
    </div>

    <main class="workspace view-split">
      <section class="pane pane-editor" aria-label="Editor">
        <div class="pane-label">Markdown</div>
        <div id="editor-root"></div>
      </section>
      <section class="pane pane-preview" aria-label="Vista previa">
        <div class="pane-label">Vista previa</div>
        <article id="preview-root" class="markdown-body"></article>
      </section>
    </main>

    <footer class="status">
      <span id="status-msg">Listo · el contenido no se guarda automáticamente</span>
      <span id="word-count"></span>
    </footer>
  </div>
`

const editorRoot = document.querySelector<HTMLElement>('#editor-root')!
const previewRoot = document.querySelector<HTMLElement>('#preview-root')!
const workspace = document.querySelector<HTMLElement>('.workspace')!
const statusMsg = document.querySelector<HTMLElement>('#status-msg')!
const wordCount = document.querySelector<HTMLElement>('#word-count')!
const exportMenu = document.querySelector<HTMLElement>('.menu-panel')!
const exportToggle = document.querySelector<HTMLButtonElement>('[data-action="export-toggle"]')!

let previewTimer: number | undefined
let editor: EditorHandle

function setStatus(message: string, temporary = false): void {
  statusMsg.textContent = message
  if (temporary) {
    window.setTimeout(() => {
      statusMsg.textContent = 'Listo · el contenido no se guarda automáticamente'
    }, 2200)
  }
}

function updateWordCount(source: string): void {
  const words = source.trim() ? source.trim().split(/\s+/).length : 0
  const chars = source.length
  wordCount.textContent = `${words} palabras · ${chars} caracteres`
}

function schedulePreview(source: string): void {
  updateWordCount(source)
  window.clearTimeout(previewTimer)
  previewTimer = window.setTimeout(() => {
    void updatePreview(previewRoot, source)
  }, 180)
}

function applyFormat(fmt: string): void {
  switch (fmt) {
    case 'h1':
      editor.insertAround('# ', '', 'Título')
      break
    case 'h2':
      editor.insertAround('## ', '', 'Título')
      break
    case 'h3':
      editor.insertAround('### ', '', 'Título')
      break
    case 'bold':
      editor.insertAround('**', '**', 'negrita')
      break
    case 'italic':
      editor.insertAround('*', '*', 'cursiva')
      break
    case 'code':
      editor.insertAround('`', '`', 'código')
      break
    case 'link':
      editor.insertAround('[', '](https://)', 'texto')
      break
    case 'ul':
      editor.insertBlock('- elemento')
      break
    case 'ol':
      editor.insertBlock('1. elemento')
      break
    case 'quote':
      editor.insertBlock('> cita')
      break
    case 'table':
      editor.insertBlock(
        [
          '| Columna 1 | Columna 2 | Columna 3 |',
          '| --------- | --------- | --------- |',
          '| A         | B         | C         |',
          '| D         | E         | F         |',
        ].join('\n'),
      )
      break
    case 'mermaid':
      editor.insertBlock(
        [
          '```mermaid',
          'flowchart TD',
          '  Start --> Stop',
          '```',
        ].join('\n'),
      )
      break
    case 'toc': {
      const headings = extractHeadings(editor.getValue())
      const toc = buildTocMarkdown(headings)
      editor.insertBlock(toc.trimEnd())
      setStatus('Índice insertado', true)
      break
    }
    case 'sample':
      if (
        editor.getValue().trim() &&
        !window.confirm('¿Reemplazar el contenido actual por el ejemplo?')
      ) {
        return
      }
      editor.setValue(SAMPLE_MARKDOWN)
      setStatus('Ejemplo cargado', true)
      break
  }
}

function setView(mode: 'split' | 'editor' | 'preview'): void {
  workspace.classList.remove('view-split', 'view-editor', 'view-preview')
  workspace.classList.add(`view-${mode}`)
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === mode)
  })
}

function closeExportMenu(): void {
  exportMenu.hidden = true
  exportToggle.setAttribute('aria-expanded', 'false')
}

// Wire UI
document.querySelector('.toolbar')!.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-fmt], button[data-view]')
  if (!target) return
  if (target.dataset.fmt) applyFormat(target.dataset.fmt)
  if (target.dataset.view) setView(target.dataset.view as 'split' | 'editor' | 'preview')
})

document.querySelector('.topbar-actions')!.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
  if (!btn) return
  const action = btn.dataset.action!

  if (action === 'export-toggle') {
    const open = exportMenu.hidden
    exportMenu.hidden = !open
    exportToggle.setAttribute('aria-expanded', String(open))
    return
  }

  closeExportMenu()
  const source = editor.getValue()

  switch (action) {
    case 'copy': {
      const ok = await copyToClipboard(source)
      setStatus(ok ? 'Markdown copiado al portapapeles' : 'No se pudo copiar', true)
      break
    }
    case 'export-md':
      downloadMarkdown(source)
      setStatus('Archivo .md descargado', true)
      break
    case 'export-html':
      downloadHtml(source, previewRoot)
      setStatus('HTML descargado', true)
      break
    case 'export-pdf':
      exportPdf(source, previewRoot)
      setStatus('Abriendo diálogo de impresión para PDF…', true)
      break
  }
})

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.menu')) closeExportMenu()
})

window.addEventListener('beforeunload', (e) => {
  if (editor.getValue().trim()) {
    e.preventDefault()
    e.returnValue = ''
  }
})

editor = createEditor(editorRoot, SAMPLE_MARKDOWN, schedulePreview)
schedulePreview(SAMPLE_MARKDOWN)
void updatePreview(previewRoot, SAMPLE_MARKDOWN)
