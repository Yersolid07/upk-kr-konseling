// src/lib/markdown.tsx
// Renderer Markdown minimal dan AMAN untuk dokumen legal & artikel.
//
// Kenapa tidak pakai react-markdown: menghindari dependensi baru (disk server
// hampir penuh) dan menghindari risiko XSS. Di sini tidak ada
// dangerouslySetInnerHTML sama sekali — semuanya jadi elemen React, sehingga
// teks pengguna tidak pernah dieksekusi sebagai HTML.

import React from 'react'

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Urutan penting: **bold** sebelum *italic* agar tidak salah potong.
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const token = m[0]
    const key = `${keyPrefix}-i${i++}`

    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="px-1.5 py-0.5 rounded bg-[var(--cream-dark)] text-[0.9em] font-mono">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('[')) {
      const mm = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (mm) {
        const href = mm[2]
        const safe = /^(https?:\/\/|\/|mailto:)/i.test(href)
        nodes.push(
          safe ? (
            <a
              key={key}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="text-[var(--terra)] font-medium underline underline-offset-2"
            >
              {mm[1]}
            </a>
          ) : (
            <span key={key}>{mm[1]}</span>
          )
        )
      } else {
        nodes.push(token)
      }
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = m.index + token.length
  }

  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** Ubah Markdown jadi elemen React. Aman untuk teks yang tidak dipercaya. */
export function renderMarkdown(src: string): React.ReactNode {
  if (!src) return null

  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let list: string[] = []
  let ordered = false
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    const items = list.map((item, idx) => (
      <li key={idx} className="leading-relaxed">
        {inline(item, `li-${key}-${idx}`)}
      </li>
    ))
    blocks.push(
      ordered ? (
        <ol key={`b${key++}`} className="list-decimal pl-5 space-y-1.5 my-3">
          {items}
        </ol>
      ) : (
        <ul key={`b${key++}`} className="list-disc pl-5 space-y-1.5 my-3">
          {items}
        </ul>
      )
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)

    if (ol) {
      if (!ordered) flushList()
      ordered = true
      list.push(ol[1])
      continue
    }
    if (ul) {
      if (ordered) flushList()
      ordered = false
      list.push(ul[1])
      continue
    }

    flushList()

    if (line.trim() === '') continue

    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const text = inline(h[2], `h-${key}`)
      const cls =
        level === 1
          ? 'font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)] mt-8 mb-4 first:mt-0'
          : level === 2
            ? 'font-[var(--font-playfair)] text-xl sm:text-2xl font-bold text-[var(--brown-dark)] mt-7 mb-3'
            : 'font-bold text-base sm:text-lg text-[var(--brown-dark)] mt-5 mb-2'
      blocks.push(
        level === 1 ? (
          <h1 key={`b${key++}`} className={cls}>{text}</h1>
        ) : level === 2 ? (
          <h2 key={`b${key++}`} className={cls}>{text}</h2>
        ) : level === 3 ? (
          <h3 key={`b${key++}`} className={cls}>{text}</h3>
        ) : (
          <h4 key={`b${key++}`} className={cls}>{text}</h4>
        )
      )
      continue
    }

    if (/^>\s?/.test(line)) {
      blocks.push(
        <blockquote
          key={`b${key++}`}
          className="border-l-4 border-[var(--terra)]/40 pl-4 py-1 my-4 italic text-[var(--text-muted)]"
        >
          {inline(line.replace(/^>\s?/, ''), `q-${key}`)}
        </blockquote>
      )
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={`b${key++}`} className="my-8 border-[var(--cream-dark)]" />)
      continue
    }

    blocks.push(
      <p key={`b${key++}`} className="leading-relaxed my-3 text-[var(--text)]">
        {inline(line, `p-${key}`)}
      </p>
    )
  }

  flushList()
  return <>{blocks}</>
}
