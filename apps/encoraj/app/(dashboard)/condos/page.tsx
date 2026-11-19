import { notFound } from 'next/navigation'
import { ObjectId } from 'mongodb'
import { css } from '@/styled-system/css'
import { condominiums, organizations } from '@/lib/db/collections'
import { getSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions'
import { paginate, parsePage } from '@/lib/pagination'
import Pagination from '../_components/Pagination'
import CondoList from '../_components/CondoList'
import CreateCondoForm from '../_components/CreateCondoForm'

const mutedCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })
const cardCss = css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '4', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })
const h1Css = css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })

/**
 * Condomínios da administradora do condomínio em que a sessão está. Para o admin da
 * administradora é sempre a dele; o super admin vê a do condomínio em que entrou.
 * NÃO é tela de plataforma: só lista condomínios com o mesmo org_id.
 */
export default async function OrgCondosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession()
  if (!session || !can(session, 'org.condos')) notFound()

  const col = await condominiums()
  const current = await col.findOne({ _id: new ObjectId(session.condoId) }, { projection: { org_id: 1 } })
  if (!current?.org_id) {
    // Só o super admin chega aqui (o admin de administradora está sempre num condomínio dela)
    return (
      <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        <h1 className={h1Css}>Administradora</h1>
        <p className={mutedCss}>Este condomínio é autogerido: não pertence a uma administradora.</p>
      </div>
    )
  }

  const { page: pageParam } = await searchParams
  const filter = { org_id: current.org_id }
  const [org, total] = await Promise.all([
    (await organizations()).findOne({ _id: current.org_id }, { projection: { name: 1 } }),
    col.countDocuments(filter),
  ])
  const pagination = paginate(total, parsePage(pageParam))
  const condos = await col
    .find(filter, { projection: { name: 1, created_at: 1 } })
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .toArray()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={h1Css}>{org?.name ?? 'Administradora'}</h1>
        <p className={mutedCss}>
          Condomínios desta administradora. Entre em um para cuidar dele: usuários, moradores, encomendas e relatórios passam
          a ser os daquele condomínio.
        </p>
      </div>

      <section className={cardCss}>
        <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Novo condomínio</h2>
        <CreateCondoForm endpoint="/api/org/condos" submitLabel="Criar condomínio" successMessage="Condomínio criado!" />
      </section>

      <CondoList condos={condos} currentCondoId={session.condoId} />

      <Pagination pathname="/condos" params={{}} pagination={pagination} />
    </div>
  )
}
