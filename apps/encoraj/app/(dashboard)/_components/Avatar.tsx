import { css } from '@/styled-system/css'

// Paleta de cores para avatares de iniciais
const PALETTE = [
  { bg: '#3b82f6', text: '#fff' }, // blue
  { bg: '#8b5cf6', text: '#fff' }, // violet
  { bg: '#10b981', text: '#fff' }, // emerald
  { bg: '#f59e0b', text: '#fff' }, // amber
  { bg: '#ef4444', text: '#fff' }, // red
  { bg: '#06b6d4', text: '#fff' }, // cyan
  { bg: '#ec4899', text: '#fff' }, // pink
  { bg: '#84cc16', text: '#fff' }, // lime
]

function hashColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const SIZE = {
  sm: { wh: '28px', fontSize: '11px' },
  md: { wh: '36px', fontSize: '13px' },
  lg: { wh: '48px', fontSize: '18px' },
  xl: { wh: '64px', fontSize: '22px' },
}

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ name, photoUrl, size = 'md', className }: AvatarProps) {
  const { wh, fontSize } = SIZE[size]
  const color = hashColor(name)

  const base = css({
    borderRadius: 'full',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    overflow: 'hidden',
    userSelect: 'none',
  })

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${base}${className ? ` ${className}` : ''}`}
        style={{ width: wh, height: wh, objectFit: 'cover' }}
      />
    )
  }

  return (
    <span
      className={`${base}${className ? ` ${className}` : ''}`}
      style={{ width: wh, height: wh, fontSize, background: color.bg, color: color.text }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  )
}
