import { renderMarkdown } from './markdown'

type MermaidApi = typeof import('mermaid').default

let mermaidPromise: Promise<MermaidApi> | null = null
let renderSeq = 0

async function getMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'neutral',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
      })
      return mermaid
    })
  }
  return mermaidPromise
}

export async function updatePreview(container: HTMLElement, source: string): Promise<void> {
  const seq = ++renderSeq
  container.innerHTML = renderMarkdown(source)

  const nodes = Array.from(container.querySelectorAll<HTMLElement>('.mermaid')).filter(
    (node) => !node.querySelector('svg'),
  )
  if (nodes.length === 0) return

  const mermaid = await getMermaid()
  if (seq !== renderSeq) return

  nodes.forEach((node, i) => {
    node.id = `mermaid-${seq}-${i}`
  })

  try {
    await mermaid.run({ nodes })
  } catch (err) {
    console.warn('Mermaid render error:', err)
  }
}
