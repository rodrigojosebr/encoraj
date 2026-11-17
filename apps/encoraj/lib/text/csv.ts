/**
 * Célula de CSV entre aspas. Valor iniciado por = + - @ viraria fórmula no Excel:
 * recebe um apóstrofo na frente.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}
