/**
 * Célula de CSV entre aspas. Valor iniciado por = + - @ viraria fórmula no Excel:
 * recebe um apóstrofo na frente.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

/** Arquivo CSV completo: separador `;` e BOM, para o Excel em português abrir direto em UTF-8. */
export function csvDocument(columns: string[], rows: Array<Array<string | number>>): string {
  const lines = [columns, ...rows].map((row) => row.map((cell) => csvCell(String(cell))).join(';'))
  return `\uFEFF${lines.join('\n')}`
}

/** Resposta HTTP de download de um CSV. */
export function csvResponse(filename: string, content: string): Response {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
