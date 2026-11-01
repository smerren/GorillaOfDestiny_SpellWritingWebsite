/** Saving a finished rune out of the page. */

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Rasterise an SVG document to a PNG of the given pixel width.
 *
 * The height follows the drawing's own proportions — a spellbook plate is a
 * portrait page, not a square, and forcing it into one would squash it.
 */
export function downloadPng(filename: string, svg: string, width: number): void {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const image = new Image()
  image.onload = () => {
    const ratio = image.naturalHeight / image.naturalWidth || 1
    const height = Math.round(width * ratio)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(image, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = pngUrl
        link.download = filename
        link.click()
        URL.revokeObjectURL(pngUrl)
      }, 'image/png')
    }
    URL.revokeObjectURL(url)
  }
  image.src = url
}

/** A filename-safe version of a spell name. */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rune'
}
