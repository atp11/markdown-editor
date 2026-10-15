import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { bracketMatching, indentOnInput } from '@codemirror/language'

export interface EditorHandle {
  view: EditorView
  getValue: () => string
  setValue: (value: string) => void
  insertAround: (before: string, after?: string, placeholder?: string) => void
  insertBlock: (block: string) => void
  replaceSelection: (text: string) => void
}

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14.5px',
  },
  '.cm-scroller': {
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    lineHeight: '1.55',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '1rem 0',
    caretColor: 'var(--accent)',
  },
  '.cm-gutters': {
    background: 'var(--editor-gutter)',
    color: 'var(--muted)',
    border: 'none',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--editor-active-line)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active-line)',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--selection) !important',
  },
})

export function createEditor(
  parent: HTMLElement,
  initialDoc: string,
  onChange: (value: string) => void,
): EditorHandle {
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    indentOnInput(),
    bracketMatching(),
    markdown(),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
    theme,
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    }),
  ]

  const state = EditorState.create({
    doc: initialDoc,
    extensions,
  })

  const view = new EditorView({ state, parent })

  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (value: string) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    },
    insertAround: (before, after = before, placeholder = '') => {
      const { from, to } = view.state.selection.main
      const selected = view.state.sliceDoc(from, to)
      const inner = selected || placeholder
      view.dispatch({
        changes: { from, to, insert: before + inner + after },
        selection: {
          anchor: from + before.length,
          head: from + before.length + inner.length,
        },
      })
      view.focus()
    },
    insertBlock: (block: string) => {
      const { from, to } = view.state.selection.main
      const doc = view.state.doc
      const line = doc.lineAt(from)
      const needsLeadingNewline = line.from !== from && doc.sliceString(from - 1, from) !== '\n'
      const insert = `${needsLeadingNewline ? '\n\n' : '\n'}${block}\n`
      view.dispatch({
        changes: { from: to, to, insert },
        selection: { anchor: to + insert.length },
      })
      view.focus()
    },
    replaceSelection: (text: string) => {
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      })
      view.focus()
    },
  }
}
