
const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/i
const SAFE_DATA_IMAGE =
  /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon)(?:;[a-z0-9=._+-]+)*,/i

/**
 * react-markdown-compatible URL transform.
 *
 * Relative URLs and the documented protocol set pass through. Dangerous
 * protocols are removed. Image data URLs are accepted for raster formats only;
 * `image/svg+xml` is rejected because it can carry script.
 */
export function defaultUrlTransform(
  url: string,
  key = 'href',
): string {
  if (typeof url !== 'string') return ''
  const value = url.trim()
  if (!value) return url

  if (value.startsWith('data:')) {
    if (key === 'src' && SAFE_DATA_IMAGE.test(value)) return value
    return ''
  }

  const colon = value.indexOf(':')
  if (colon < 0) return value

  const questionMark = value.indexOf('?')
  const numberSign = value.indexOf('#')
  const slash = value.indexOf('/')

  const relative =
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign)

  if (relative) return value
  return SAFE_PROTOCOL.test(value.slice(0, colon)) ? value : ''
}

export function isExternalUrl(url: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url)
}

export function resolveUrl(url: string, baseUrl: string | undefined): string {
  if (!baseUrl) return url
  if (!url || url.startsWith('#') || url.startsWith('//')) return url
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  try {
    return new URL(url, baseUrl).toString()
  } catch {
    return url
  }
}

