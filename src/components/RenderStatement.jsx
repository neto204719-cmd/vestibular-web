import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'

/**
 * Renders a text string with support for:
 * - LaTeX inline: $...$
 * - LaTeX block: $$...$$
 * - Markdown tables: | col1 | col2 |
 * - Bold: **text**
 * - Italic: *text*
 * - Underline: <u>text</u>
 * - Line breaks preserved
 */
export default function RenderStatement({ text, className }) {
  if (!text) return null

  // react-markdown needs double newlines for paragraph breaks.
  // But we also need to preserve single \n as <br> within paragraphs.
  // We handle this by converting single \n to double \n (markdown paragraph),
  // but only when it's not inside a table or LaTeX block.
  const processed = preprocessText(text)

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          // Make paragraphs inherit styling without extra margin
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // Style tables for dark theme
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="render-table">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="render-th">{children}</th>,
          td: ({ children }) => <td className="render-td">{children}</td>,
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Preprocess text to handle edge cases:
 * - Preserve line breaks as markdown paragraphs
 * - Don't mess with table rows or LaTeX blocks
 */
function preprocessText(text) {
  const lines = text.split('\n')
  const result = []
  let inTable = false
  let inLatexBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Track LaTeX block state
    if (trimmed.startsWith('$$')) {
      inLatexBlock = !inLatexBlock
      result.push(line)
      continue
    }
    if (inLatexBlock) {
      result.push(line)
      continue
    }

    // Track table state (lines starting with |)
    if (trimmed.startsWith('|')) {
      inTable = true
      result.push(line)
      continue
    }
    if (inTable && !trimmed.startsWith('|')) {
      inTable = false
    }

    // Empty lines stay as paragraph separators
    if (trimmed === '') {
      result.push('')
      continue
    }

    // For non-table, non-LaTeX lines: add a blank line before
    // to force a paragraph break (if previous line wasn't empty and wasn't a table)
    if (i > 0 && result.length > 0 && result[result.length - 1].trim() !== '' && !result[result.length - 1].trim().startsWith('|')) {
      result.push('')
    }
    result.push(line)
  }

  return result.join('\n')
}
