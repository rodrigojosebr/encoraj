const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I para evitar confusão visual

export function generateCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}
