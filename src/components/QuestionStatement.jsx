import { useMemo } from 'react'
import RenderStatement from './RenderStatement'

const IMAGE_PLACEHOLDER = '[IMAGEM]'

/**
 * Parses image_url field — can be a JSON array of URLs, a single URL, or null.
 */
function parseImageUrls(imageUrl) {
  if (!imageUrl) return []
  if (typeof imageUrl === 'string') {
    const trimmed = imageUrl.trim()
    if (trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed) } catch { return [] }
    }
    return [trimmed]
  }
  if (Array.isArray(imageUrl)) return imageUrl
  return []
}

function QuestionImage({ src, alt, maxHeight = 320 }) {
  if (!src) return null
  return (
    <figure className="question-image my-4 flex justify-center">
      <img
        src={src}
        alt={alt || 'Imagem da questão'}
        loading="lazy"
        className="max-w-full object-contain"
        style={{ maxHeight: `${maxHeight}px` }}
      />
    </figure>
  )
}

/**
 * Renders a question statement with inline [IMAGEM] placeholder replacement.
 * Falls back to rendering image at the end if no placeholder is found.
 *
 * Props:
 * - statement: text with optional [IMAGEM] placeholder
 * - hasImage: boolean
 * - imageUrl: string URL, JSON-stringified array, or array of URLs
 * - imageDescription: alt text
 * - maxHeight: max height for image (default 320)
 * - className: optional wrapper className
 */
export default function QuestionStatement({
  statement,
  hasImage,
  imageUrl,
  imageDescription,
  maxHeight = 320,
  className = '',
}) {
  const imageUrls = useMemo(() => parseImageUrls(imageUrl), [imageUrl])
  const firstUrl = imageUrls[0] || null

  const parts = useMemo(() => {
    if (!statement) return { before: '', after: '', inline: false }
    if (hasImage && firstUrl && statement.includes(IMAGE_PLACEHOLDER)) {
      const [before, ...rest] = statement.split(IMAGE_PLACEHOLDER)
      return {
        before: before.trimEnd(),
        after: rest.join(IMAGE_PLACEHOLDER).trimStart(),
        inline: true,
      }
    }
    return { before: statement, after: '', inline: false }
  }, [statement, hasImage, firstUrl])

  return (
    <div className={`question-statement ${className}`}>
      {parts.before && <RenderStatement text={parts.before} className="render-statement" />}
      {hasImage && firstUrl && parts.inline && (
        <QuestionImage src={firstUrl} alt={imageDescription} maxHeight={maxHeight} />
      )}
      {parts.after && <RenderStatement text={parts.after} className="render-statement" />}
      {hasImage && firstUrl && !parts.inline && (
        <QuestionImage src={firstUrl} alt={imageDescription} maxHeight={maxHeight} />
      )}
    </div>
  )
}
