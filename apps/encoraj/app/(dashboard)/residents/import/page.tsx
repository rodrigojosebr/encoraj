import Link from 'next/link'
import { Download } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@encoraj/ui'
import { readSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { css } from '@/styled-system/css'
import { cardCss, h1Css, h2Css, mutedCss } from '@/app/(dashboard)/_lib/styles'
import ImportResidentsForm from './_components/ImportResidentsForm'

const tipsCss = css({
  m: '0',
  pl: '5',
  listStyleType: 'disc',
  display: 'flex',
  flexDir: 'column',
  gap: '1',
  fontSize: 'sm',
  color: 'gray.700',
  _dark: { color: 'gray.300' },
})

/** Importação de moradores por planilha: baixar o modelo, enviar preenchido, conferir e importar. */
export default async function ImportResidentsPage() {
  const session = await readSession()
  if (!session) redirect('/api/auth/logout')
  if (!can(session, 'residents.import')) notFound()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '720px' })}>
      <div>
        <Link
          href="/residents"
          className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
        >
          ← Moradores
        </Link>
        <h1 className={`${h1Css} ${css({ mt: '2' })}`}>Importar moradores</h1>
        <p className={mutedCss}>Cadastre vários moradores de uma vez, a partir de uma planilha.</p>
      </div>

      <section className={cardCss}>
        <h2 className={h2Css}>1. Baixe o modelo e preencha</h2>
        <ul className={tipsCss}>
          <li>Uma linha por morador. Não mude os títulos das colunas.</li>
          <li><strong>Bloco</strong>: deixe em branco se o condomínio não tem blocos.</li>
          <li>
            <strong>Apartamento</strong>: o Excel apaga o zero à esquerda (&quot;01&quot; vira &quot;1&quot;). Se as unidades
            começam com zero, formate a coluna como Texto antes de digitar.
          </li>
          <li><strong>WhatsApp</strong>: DDD + número, só os dígitos. Exemplo: 11999990000.</li>
          <li>Salve como CSV. No Excel: Arquivo → Salvar como → &quot;CSV UTF-8 (delimitado por vírgulas)&quot;.</li>
        </ul>
        <div>
          <a href="/api/residents/import/template" download>
            <Button type="button" variant="outline" intent="secondary" leftIcon={<Download size={16} />}>
              Baixar modelo
            </Button>
          </a>
        </div>
      </section>

      <ImportResidentsForm />
    </div>
  )
}
