import MarkdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import DOMPurify from 'dompurify'
import { slugify } from './toc'

export interface Heading {
  level: number
  text: string
  id: string
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
}).use(markdownItAnchor, {
  slugify,
  permalink: markdownItAnchor.permalink.linkInsideHeader({
    symbol: '#',
    placement: 'before',
    class: 'header-anchor',
  }),
})

/** Extract headings from markdown source for TOC generation. */
export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = []
  const used = new Map<string, number>()
  const lines = source.split('\n')
  let inFence = false

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{1,6})\s+(.+)$/.exec(line)
    if (!match) continue

    const level = match[1].length
    const text = match[2].replace(/#+\s*$/, '').trim()
    let id = slugify(text)
    const count = used.get(id) ?? 0
    used.set(id, count + 1)
    if (count > 0) id = `${id}-${count}`

    headings.push({ level, text, id })
  }

  return headings
}

/** Build a markdown TOC from headings. */
export function buildTocMarkdown(headings: Heading[], minLevel = 1, maxLevel = 3): string {
  const filtered = headings.filter((h) => h.level >= minLevel && h.level <= maxLevel)
  if (filtered.length === 0) {
    return '<!-- No hay encabezados para generar el índice -->\n'
  }

  const base = Math.min(...filtered.map((h) => h.level))
  const lines = filtered.map((h) => {
    const indent = '  '.repeat(h.level - base)
    return `${indent}- [${h.text}](#${h.id})`
  })

  return ['## Índice', '', ...lines, ''].join('\n')
}

/**
 * Render markdown to sanitized HTML.
 * Mermaid fences become <div class="mermaid"> for later rendering.
 */
export function renderMarkdown(source: string): string {
  const tokens = md.parse(source, {})

  // Convert mermaid fences into renderable containers before rendering HTML
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === 'fence' && token.info.trim().split(/\s+/)[0] === 'mermaid') {
      token.type = 'html_block'
      token.tag = ''
      token.content = `<div class="mermaid">${escapeHtml(token.content.trim())}</div>\n`
      token.map = token.map
    }
  }

  const raw = md.renderer.render(tokens, md.options, {})
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['target', 'rel'],
  })
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
