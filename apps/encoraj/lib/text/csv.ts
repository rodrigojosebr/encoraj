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

/** Separador do arquivo: o que mais aparece na primeira linha escrita. Empate fica com `;`. */
function detectDelimiter(text: string): string {
  const firstLine = text.match(/[^\r\n]*\S[^\r\n]*/)?.[0] ?? ''
  let delimiter = ';'
  let most = 0
  for (const candidate of [';', ',', '\t']) {
    const count = firstLine.split(candidate).length - 1
    if (count > most) {
      delimiter = candidate
      most = count
    }
  }
  return delimiter
}

/**
 * Lê um CSV e devolve as linhas, cada uma com as células em texto. Aceita `;` (Excel em
 * português), `,` ou tabulação; célula entre aspas, com `""` e quebra de linha dentro; fim de
 * linha de Windows, Mac ou Linux.
 *
 * Linha em branco vem como `['']`, não é pulada: assim a posição no resultado continua
 * igual ao número da linha que o Excel mostra.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '')
  const delimiter = detectDelimiter(source)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char !== '"') {
        cell += char
      } else if (source[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        quoted = false
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  // última linha sem quebra no fim
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}
