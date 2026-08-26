import JSZip from 'jszip'
import { readFileSync, writeFileSync } from 'node:fs'

const zip = new JSZip()
const img1 = readFileSync('test-files/diagram-cell.png')
const img2 = readFileSync('test-files/diagram-cycle.png')

zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`)

const rels = (targets) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets.map((t, i) => `<Relationship Id="rId${i + 1}" Type="${t.type}" Target="${t.target}"/>`).join('')}</Relationships>`

zip.folder('_rels').file('.rels', rels([{ type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', target: 'ppt/presentation.xml' }]))

zip.folder('ppt').file('presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`)

const slides = zip.folder('ppt/slides')
const slideRels = zip.folder('ppt/slides/_rels')

slides.file('slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>
<p:pic><a:blip r:embed="rId1"/></p:pic>
<p:sp><a:blip r:embed="rId2"/></p:sp>
<p:sp><p:txBody><a:p><a:r><a:t>The cell diagram shows the organelles involved in photosynthesis.</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld></p:sld>`)

slides.file('slide2.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree>
<p:pic><a:blip r:embed="rId1"/></p:pic>
<p:sp><p:txBody><a:p><a:r><a:t>The light cycle converts light energy into chemical energy stored as ATP.</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld></p:sld>`)

slideRels.file('slide1.xml.rels', rels([
  { type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: '../media/diagram-cell.png' },
  { type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: '../media/diagram-cycle.png' }
]))
slideRels.file('slide2.xml.rels', rels([
  { type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', target: '../media/diagram-cell.png' }
]))

zip.folder('ppt').folder('media')
zip.file('ppt/media/diagram-cell.png', img1)
zip.file('ppt/media/diagram-cycle.png', img2)

zip.generateAsync({ type: 'nodebuffer' }).then(buf => {
  writeFileSync('test-files/biology-slides-images.pptx', buf)
  console.log('Created test-files/biology-slides-images.pptx', buf.length, 'bytes')
})
