// Builds the app icons from the logo source (docs/brand/logo.svg).
// Run after changing the logo:  node scripts/brand-icons.mjs
//
// Writes, in src/app (Next.js picks them up by file name):
//   icon.svg       the logo itself, for browsers that take SVG icons
//   favicon.ico    16, 32 and 48 px PNGs in one .ico, for the others
//   apple-icon.png 180 px, logo on the page colour (iOS home screen, Safari)
//
// Uses sharp, installed with Next.js.

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(ROOT, 'docs/brand/logo.svg')
const OUT = path.join(ROOT, 'src/app')
const CANVAS = '#ffe9c7' // --color-canvas

const svg = await fs.readFile(SOURCE)

async function png(size) {
  return sharp(svg, { density: 72 * (size / 56) * 4 }).resize(size, size).png().toBuffer()
}

// An .ico file: a header, one 16-byte entry per image, then the PNGs.
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0) // width
    entry.writeUInt8(size, 1) // height
    entry.writeUInt8(0, 2) // no palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

await fs.copyFile(SOURCE, path.join(OUT, 'icon.svg'))

const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map(async (size) => ({ size, data: await png(size) })))
await fs.writeFile(path.join(OUT, 'favicon.ico'), ico(images))

// iOS rounds the corners itself and shows transparency as black: fill the square, logo at 70 %.
const apple = 180
const logo = await png(Math.round(apple * 0.7))
await sharp({ create: { width: apple, height: apple, channels: 4, background: CANVAS } })
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toFile(path.join(OUT, 'apple-icon.png'))

console.log('Wrote icon.svg, favicon.ico (16, 32, 48) and apple-icon.png (180) in src/app')
