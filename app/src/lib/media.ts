export type UploadedImageVariant =
  | 'thumb'
  | 'card'
  | 'gallery'
  | 'lightbox'
  | 'content'
  | 'hero'

const VARIANT_WIDTHS: Record<UploadedImageVariant, number[]> = {
  thumb: [96, 192],
  card: [360, 640, 960],
  gallery: [480, 720, 960, 1280],
  lightbox: [1280, 1600, 1920],
  content: [480, 800, 1200],
  hero: [640, 960, 1440, 1920],
}

const VARIANT_SIZES: Record<UploadedImageVariant, string> = {
  thumb: '96px',
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  gallery: '(max-width: 640px) 100vw, (max-width: 1280px) 34vw, 420px',
  lightbox: '100vw',
  content: '(max-width: 768px) 100vw, 80vw',
  hero: '100vw',
}

export function isUploadedImagePath(src: string) {
  return src.startsWith('/uploads/')
}

export function getUploadedImageWidths(variant: UploadedImageVariant = 'content') {
  return VARIANT_WIDTHS[variant]
}

export function getUploadedImageSizes(variant: UploadedImageVariant = 'content') {
  return VARIANT_SIZES[variant]
}

export function buildUploadedImageUrl(
  src: string,
  options: {
    width?: number
    quality?: number
    format?: 'webp'
  } = {},
) {
  const { width, quality = 76, format = 'webp' } = options
  const url = new URL(src, 'http://local')

  if (width) {
    url.searchParams.set('w', String(width))
  }

  url.searchParams.set('q', String(quality))
  url.searchParams.set('fm', format)

  return `${url.pathname}${url.search}`
}

export function buildUploadedImageSrcSet(src: string, variant: UploadedImageVariant = 'content') {
  return getUploadedImageWidths(variant)
    .map((width) => `${buildUploadedImageUrl(src, { width })} ${width}w`)
    .join(', ')
}

export function getUploadedImageFallbackSrc(src: string, variant: UploadedImageVariant = 'content') {
  const widths = getUploadedImageWidths(variant)
  return buildUploadedImageUrl(src, { width: widths[widths.length - 1] })
}

export function getUploadedImageThumbSrc(src: string) {
  return buildUploadedImageUrl(src, { width: 192 })
}
