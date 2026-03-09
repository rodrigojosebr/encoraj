/**
 * Gera os ícones PWA estáticos em public/
 * Requer: sharp (yarn add -D sharp)
 * Uso: node scripts/gen-icons.mjs
 */
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '../public')

function drawIcon(size, radius, padding = 0) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // fundo arredondado
  const r = radius
  const x = padding
  const y = padding
  const w = size - padding * 2
  const h = size - padding * 2

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()

  ctx.fillStyle = '#2563eb'
  ctx.fill()

  // letra E
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(size * 0.58)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('E', size / 2, size / 2 + size * 0.04)

  return canvas.toBuffer('image/png')
}

const configs = [
  { file: 'icon-192.png',          size: 192, radius: 40,  padding: 0  },
  { file: 'icon-512.png',          size: 512, radius: 100, padding: 0  },
  { file: 'icon-maskable-192.png', size: 192, radius: 20,  padding: 32 },
  { file: 'icon-maskable-512.png', size: 512, radius: 40,  padding: 80 },
]

for (const { file, size, radius, padding } of configs) {
  const buf = drawIcon(size, radius, padding)
  writeFileSync(resolve(PUBLIC, file), buf)
  console.log(`Generated ${file}`)
}
