import JSZip from 'jszip'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_IMAGES = 50
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp']

function mimeFromName(name) {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'bmp') return 'image/bmp'
  return null
}

export async function extractImages(file, type) {
  if (type !== 'pptx' && type !== 'docx') return []
  try {
    const buf = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf)
    const images = []

    if (type === 'pptx') {
      const slideRels = Object.keys(zip.files)
        .filter(n => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(n))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10)
          const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10)
          return na - nb
        })

      const mediaToSlide = new Map()
      for (const relPath of slideRels) {
        const slideNum = parseInt(relPath.match(/slide(\d+)\.xml/)[1], 10)
        const relsXml = await zip.files[relPath].async('string')
        for (const m of relsXml.matchAll(/Target="[^"]*media\/([^"]+)"/g)) {
          const mediaName = m[1]
          if (!mediaToSlide.has(mediaName)) mediaToSlide.set(mediaName, slideNum)
        }
      }

      for (const [mediaName, slideNum] of mediaToSlide) {
        const entry = zip.files[`ppt/media/${mediaName}`]
        if (!entry) continue
        const mime = mimeFromName(mediaName)
        if (!mime || !ALLOWED.includes(mime)) continue
        const blob = await entry.async('blob')
        if (blob.size > MAX_IMAGE_BYTES) continue
        images.push({ blob, mime, slideNumber: slideNum })
        if (images.length >= MAX_IMAGES) break
      }
    } else {
      const mediaFiles = Object.keys(zip.files)
        .filter(n => /^word\/media\//.test(n))
        .sort()
      for (const path of mediaFiles) {
        const entry = zip.files[path]
        const name = path.split('/').pop()
        const mime = mimeFromName(name)
        if (!mime || !ALLOWED.includes(mime)) continue
        const blob = await entry.async('blob')
        if (blob.size > MAX_IMAGE_BYTES) continue
        images.push({ blob, mime, slideNumber: null })
        if (images.length >= MAX_IMAGES) break
      }
    }

    return images
  } catch {
    return []
  }
}
