const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
let _token = null
export function setToken(t) { _token = t }
export function getToken()  { return _token }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}

/**
 * Gerador assíncrono para consumir Server-Sent Events de /api/chat.
 * Emite objetos JSON conforme chegam do servidor.
 *
 * Protocolo esperado:
 *   { text: "chunk" }              → fragmento de texto (streaming)
 *   { done: true, mediaUrl: "..." }→ resposta completa
 *   { error: "mensagem" }          → erro
 *
 * @yields {object} evento SSE parseado
 */
export async function* streamPost(path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer    = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim() // remove "data: " prefix + \r de \r\n
      try { yield JSON.parse(payload) } catch { /* linha malformada */ }
    }
  }
}
