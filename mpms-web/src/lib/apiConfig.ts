export function createApiUrl(base: string, path: string) {
  const normalized = (base.trim() || '/api').replace(/\/+$/, '')
  if (normalized.startsWith('//')) throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL or a same-origin path.')
  if (!normalized.startsWith('/')) {
    const url = new URL(normalized)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('VITE_API_BASE_URL must not include credentials, queries, or fragments.')
  } else if (normalized.includes('?') || normalized.includes('#')) throw new Error('VITE_API_BASE_URL must not include queries or fragments.')
  return `${normalized}/${path.replace(/^\/+/, '')}`
}

export const apiUrl = (path: string) => createApiUrl(import.meta.env?.VITE_API_BASE_URL || '/api', path)
export const publicDemoReadOnly = import.meta.env?.VITE_DEMO_READ_ONLY === 'true'
