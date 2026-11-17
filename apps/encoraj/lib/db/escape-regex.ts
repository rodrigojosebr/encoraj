/** Escapa texto digitado pelo usuário antes de usar em `$regex`. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
