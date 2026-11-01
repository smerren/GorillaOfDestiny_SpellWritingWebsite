/** Saving a finished rune out of the page. */

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Rasterise an SVG document to a PNG of the given pixel size. */
export function downloadPng(filename: string, svg: string, size: number): void {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (context) {
      context.drawImage(image, 0, 0, size, size)
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
