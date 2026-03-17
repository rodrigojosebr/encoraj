export const APP_TZ = 'America/Sao_Paulo'

/**
 * Retorna { today, tomorrow } como timestamps UTC que correspondem a
 * meia-noite e meia-noite+1d no fuso do app (BRT = UTC-3).
 *
 * Exemplo: às 21h30 BRT do dia 17 no servidor UTC é dia 18 00h30 UTC.
 * Sem esse fix, "hoje" começaria às 21h do dia anterior.
 */
export function getTodayRange(): { today: Date; tomorrow: Date } {
  const now = new Date()

  // Partes da data atual no fuso do app
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const p = (type: string) => parseInt(parts.find(t => t.type === type)!.value)
  const year = p('year'), month = p('month'), day = p('day')

  // Calcula o offset UTC↔TZ ao meio-dia (evita problemas de horário de verão na meia-noite)
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offsetMs = getUTCOffsetMs(noonUTC)

  // Meia-noite BRT em UTC: Date.UTC(y,m,d,0,0,0) - offsetMs
  // Exemplo UTC-3: offsetMs = -10_800_000 → meia-noite BRT = UTC 03:00
  const today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

  return { today, tomorrow }
}

/**
 * Converte uma string "YYYY-MM-DD" (da URL) para o timestamp UTC
 * correspondente à meia-noite nesse dia no fuso do app.
 */
export function parseDateAsTZ(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const offsetMs = getUTCOffsetMs(noonUTC)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs)
}

/** Formata data sem hora no fuso do app. */
export function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: APP_TZ })
}

/** Formata data com hora no fuso do app. */
export function fmtDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('pt-BR', { timeZone: APP_TZ })
}

// ---------------------------------------------------------------------------
// Interno
// ---------------------------------------------------------------------------

function getUTCOffsetMs(date: Date): number {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date)

  const toMs = (parts: Intl.DateTimeFormatPart[]) => {
    const p = (t: string) => parseInt(parts.find(x => x.type === t)!.value)
    const h = p('hour')
    return Date.UTC(p('year'), p('month') - 1, p('day'), h === 24 ? 0 : h, p('minute'), p('second'))
  }

  return toMs(fmt(APP_TZ)) - toMs(fmt('UTC'))
}
