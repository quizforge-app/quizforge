import { PDFDocument, StandardFonts } from 'pdf-lib'
import JSZip from 'jszip'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'test-files'
mkdirSync(OUT, { recursive: true })

const paragraphs = [
  'Photosynthesis is the process by which green plants convert sunlight into chemical energy.',
  'Chlorophyll is the pigment inside chloroplasts that absorbs light most strongly in the blue and red regions of the spectrum.',
  'During the light dependent reactions water molecules are split and oxygen is released as a byproduct.',
  'The Calvin cycle produces glucose by fixing carbon dioxide using ATP and NADPH from the light reactions.',
  'Mitochondria are organelles that generate ATP through cellular respiration in both plants and animals.',
  'Osmosis is the movement of water across a semipermeable membrane from low to high solute concentration.',
  'Enzymes are biological catalysts that speed up reactions by lowering activation energy without being consumed.',
  'Deoxyribonucleic acid stores genetic information in the sequence of its four nitrogen bases.'
].join('\n\n')

const pdf = await PDFDocument.create()
const font = await pdf.embedFont(StandardFonts.Helvetica)
let page = pdf.addPage([595, 842])
page.drawText('Biology Study Notes', { x: 50, y: 800, size: 20, font })
let y = 770
for (const line of paragraphs.split('\n')) {
  if (y < 60) { page = pdf.addPage([595, 842]); y = 800 }
  page.drawText(line, { x: 50, y, size: 11, font, maxWidth: 500 })
  y -= 18
}
writeFileSync(`${OUT}/biology-notes.pdf`, await pdf.save())

async function makeDocx() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
  const body = [
    'World War II began in 1939 when Germany invaded Poland.',
    'The Treaty of Versailles ended World War I and imposed heavy reparations on Germany.',
    'D-Day was the Allied invasion of Normandy on June 6 1944.',
    'The atomic bombs were dropped on Hiroshima and Nagasaki in August 1945.',
    'Winston Churchill served as Prime Minister of the United Kingdom during most of the war.',
    'The Holocaust was the systematic persecution and murder of six million Jewish people.',
    'Pearl Harbor was attacked by Japan on December 7 1941 bringing the United States into the war.',
    'The war in Europe ended with German surrender in May 1945 known as VE Day.'
  ].map(p => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')
  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`)
  return zip.generateAsync({ type: 'uint8array' })
}
writeFileSync(`${OUT}/history-chapter.docx`, await makeDocx())

async function makePptx() {
  const zip = new JSZip()
  const slideText = (lines) => lines.map(l => `<a:p><a:r><a:t>${l}</a:t></a:r></a:p>`).join('')
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`)
  const rels = (targets) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets.map((t, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${t}"/>`).join('')}</Relationships>`
  zip.folder('_rels').file('.rels', rels(['ppt/presentation.xml']).replace('officeDocument/2006/relationships/slide', 'officeDocument/2006/relationships/officeDocument'))
  zip.folder('ppt').file('presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`)
  const slides = zip.folder('ppt/slides')
  slides.file('slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree>
${slideText(['Introduction to Programming', 'Variables store data values in memory.', 'Functions are reusable blocks of code that perform specific tasks.', 'Loops allow code to run repeatedly such as for loops and while loops.'])}
</p:spTree></p:cSld></p:sld>`)
  slides.file('slide2.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree>
${slideText(['Data Structures', 'Arrays hold ordered collections of elements accessed by index.', 'A stack follows the Last In First Out principle.', 'Queues process elements in First In First Out order.', 'Hash tables map keys to values for fast lookup.'])}
</p:spTree></p:cSld></p:sld>`)
  return zip.generateAsync({ type: 'uint8array' })
}
writeFileSync(`${OUT}/programming-basics.pptx`, await makePptx())

console.log('Test files created in test-files/')

