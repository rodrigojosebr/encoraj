'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Alert, Button, useToast } from '@encoraj/ui'
import { css } from '@/styled-system/css'
import { cardCss, h2Css, mutedCss } from '@/app/(dashboard)/_lib/styles'

/** Resposta de POST /api/residents/import no modo de conferência */
interface SheetCheck {
  to_create: number
  sample: Array<{ line: number; name: string; unit: string; whatsapp: string }>
  skipped_count: number
  skipped: Array<{ line: number; name: string; unit: string; note: string }>
  error_count: number
  errors: Array<{ line: number; message: string }>
}

const SEND_FAILED = 'Não foi possível enviar o arquivo. Se você alterou a planilha, escolha o arquivo de novo.'

const residentsCount = (count: number) => (count === 1 ? '1 morador' : `${count.toLocaleString('pt-BR')} moradores`)

type Sent<T> = { data: T; error?: never } | { data?: never; error: string }

async function sendSheet<T>(sheet: File, mode: 'check' | 'import'): Promise<Sent<T>> {
  const body = new FormData()
  body.set('file', sheet)
  body.set('mode', mode)

  try {
    const res = await fetch('/api/residents/import', { method: 'POST', body })
    const data = await res.json().catch(() => null)
    return res.ok ? { data } : { error: data?.error ?? SEND_FAILED }
  } catch {
    // sem rede, ou o arquivo mudou no disco depois de escolhido
    return { error: SEND_FAILED }
  }
}

/** Linhas da planilha com o número de cada uma na frente. */
function SheetLines({ items }: { items: Array<{ line: number; text: string }> }) {
  return (
    <ul className={css({ listStyle: 'none', m: '0', p: '0', display: 'flex', flexDir: 'column' })}>
      {items.map((item, index) => (
        <li
          key={`${item.line}-${index}`}
          className={css({
            display: 'flex',
            gap: '3',
            py: '2',
            fontSize: 'sm',
            color: 'gray.800',
            borderTop: '1px solid',
            borderColor: 'gray.100',
            _dark: { color: 'gray.200', borderColor: 'gray.800' },
          })}
        >
          <span className={css({ flexShrink: 0, w: '20', whiteSpace: 'nowrap', color: 'gray.500', _dark: { color: 'gray.400' } })}>
            Linha {item.line}
          </span>
          <span className={css({ minW: '0', overflowWrap: 'anywhere' })}>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

/** Passo 2 em diante: envia a planilha, mostra a conferência e só então importa. */
export default function ImportResidentsForm() {
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [check, setCheck] = useState<SheetCheck | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'check' | 'import' | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = '' // escolher o mesmo arquivo de novo, depois de corrigir, dispara o onChange
    if (!picked) return

    setFile(picked)
    setCheck(null)
    setError(null)
    setBusy('check')
    const sent = await sendSheet<SheetCheck>(picked, 'check')
    setBusy(null)
    if (sent.error !== undefined) setError(sent.error)
    else setCheck(sent.data)
  }

  async function handleImport() {
    if (!file) return

    setError(null)
    setBusy('import')
    const sent = await sendSheet<{ created: number }>(file, 'import')
    if (sent.error !== undefined) {
      setError(sent.error)
      setBusy(null)
      return
    }
    // segue ocupado até a navegação trocar a tela: não dá para importar duas vezes
    toast({ variant: 'success', message: `${residentsCount(sent.data.created)} ${sent.data.created === 1 ? 'importado' : 'importados'}!` })
    router.push('/residents')
  }

  const hiddenErrors = check ? check.error_count - check.errors.length : 0
  const hiddenSkipped = check ? check.skipped_count - check.skipped.length : 0

  return (
    <>
      <section className={cardCss}>
        <h2 className={h2Css}>2. Envie a planilha preenchida</h2>
        <p className={mutedCss}>
          Primeiro a planilha é só conferida. Nada é gravado até você confirmar no passo seguinte.
        </p>
        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3' })}>
          <Button
            type="button"
            variant="outline"
            intent="secondary"
            leftIcon={<Upload size={16} />}
            loading={busy === 'check'}
            disabled={busy !== null}
            onClick={() => inputRef.current?.click()}
          >
            {file ? 'Escolher outro arquivo' : 'Escolher arquivo'}
          </Button>
          {file && (
            <span className={`${mutedCss} ${css({ minW: '0', overflowWrap: 'anywhere' })}`}>
              {busy === 'check' ? `Conferindo ${file.name}…` : file.name}
            </span>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className={css({ display: 'none' })} onChange={handleFile} />
        {error && !check && <Alert variant="error">{error}</Alert>}
      </section>

      {check && check.error_count > 0 && (
        <section className={cardCss}>
          <h2 className={h2Css}>3. Corrija a planilha</h2>
          <Alert variant="error">
            {check.error_count === 1 ? 'Há 1 problema na planilha.' : `Há ${check.error_count.toLocaleString('pt-BR')} problemas na planilha.`}{' '}
            Nada foi importado. Corrija no arquivo e envie de novo.
          </Alert>
          <SheetLines items={check.errors.map((item) => ({ line: item.line, text: item.message }))} />
          {hiddenErrors > 0 && (
            <p className={mutedCss}>E mais {hiddenErrors.toLocaleString('pt-BR')}. Corrija estes e envie de novo para ver o restante.</p>
          )}
        </section>
      )}

      {check && check.error_count === 0 && (
        <section className={cardCss}>
          <h2 className={h2Css}>3. Confira e importe</h2>

          {check.to_create === 0 ? (
            <Alert variant="info">Todos os moradores desta planilha já estão cadastrados. Não há nada para importar.</Alert>
          ) : (
            <>
              <p className={css({ fontSize: 'sm', color: 'gray.800', _dark: { color: 'gray.200' } })}>
                <strong>{residentsCount(check.to_create)}</strong> {check.to_create === 1 ? 'será cadastrado' : 'serão cadastrados'}.
                {check.to_create > check.sample.length ? ' Os primeiros, para conferir se as colunas estão no lugar:' : ''}
              </p>
              <SheetLines
                items={check.sample.map((item) => ({ line: item.line, text: `${item.name} — ${item.unit}, ${item.whatsapp}` }))}
              />
            </>
          )}

          {check.skipped_count > 0 && (
            <details>
              <summary className={css({ fontSize: 'sm', cursor: 'pointer', color: 'gray.700', _dark: { color: 'gray.300' } })}>
                {residentsCount(check.skipped_count)} {check.skipped_count === 1 ? 'não entra' : 'não entram'}, por já ter cadastro ou estar repetido na planilha
              </summary>
              <SheetLines
                items={check.skipped.map((item) => ({ line: item.line, text: `${item.name} — ${item.unit}. ${item.note}` }))}
              />
              {hiddenSkipped > 0 && <p className={mutedCss}>E mais {hiddenSkipped.toLocaleString('pt-BR')}.</p>}
            </details>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {check.to_create > 0 && (
            <div>
              <Button type="button" loading={busy === 'import'} disabled={busy !== null} onClick={handleImport}>
                Importar {residentsCount(check.to_create)}
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  )
}
