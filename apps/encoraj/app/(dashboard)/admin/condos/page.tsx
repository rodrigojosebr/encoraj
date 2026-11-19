import { notFound } from 'next/navigation'
import { css } from '@/styled-system/css'
import { condominiums, organizations } from '@/lib/db/collections'
import { getSuperAdminSession } from '@/lib/auth/super-admin'
import { paginate, parsePage } from '@/lib/pagination'
import Pagination from '../../_components/Pagination'
import CondoList from '../../_components/CondoList'
import CreateCondoForm from '../../_components/CreateCondoForm'

const mutedCss = css({ fontSize: 'sm', color: 'gray.500', _dark: { color: 'gray.400' } })
const cardCss = css({ bg: 'white', border: '1px solid', borderColor: 'gray.200', borderRadius: 'lg', p: { base: '4', md: '6' }, display: 'flex', flexDir: 'column', gap: '4', _dark: { bg: 'gray.900', borderColor: 'gray.700' } })
const h2Css = css({ fontSize: 'lg', fontWeight: 'semibold', color: 'gray.900', _dark: { color: 'gray.50' } })

/** Condomínios da plataforma — TODOS. Só super admin: cria administradora ou condomínio autogerido e entra em qualquer um. */
export default async function AdminCondosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSuperAdminSession()
  if (!session) notFound()

  const { page: pageParam } = await searchParams
  const col = await condominiums()
  // Tela de plataforma: de propósito NÃO filtra por condomínio
  const pagination = paginate(await col.countDocuments({}), parsePage(pageParam))
  const condos = await col
    .find({}, { projection: { name: 1, org_id: 1, created_at: 1 } })
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.pageSize)
    .toArray()

  const orgIds = condos.flatMap((condo) => (condo.org_id ? [condo.org_id] : []))
  const orgs = await (await organizations()).find({ _id: { $in: orgIds } }, { projection: { name: 1 } }).toArray()
  const orgNames = new Map(orgs.map((org) => [org._id.toString(), org.name]))
  const tags = new Map(
    condos.map((condo) => [
      condo._id.toString(),
      condo.org_id ? `Administradora: ${orgNames.get(condo.org_id.toString()) ?? 'não encontrada'}` : 'Autogerido',
    ]),
  )

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>Condomínios</h1>
        <p className={mutedCss}>
          Todos os condomínios da plataforma. Um condomínio é autogerido (tem o próprio administrador) ou pertence a uma
          administradora (o administrador dela cuida de todos os condomínios dela e cria os próximos). Para agir dentro de
          um condomínio, entre nele: as telas passam a mostrar e alterar aquele condomínio, e tudo fica registrado no seu nome.
        </p>
      </div>

      <section className={cardCss}>
        <h2 className={h2Css}>Nova administradora</h2>
        <p className={mutedCss}>Nasce com o primeiro condomínio e com o administrador dela.</p>
        <CreateCondoForm endpoint="/api/admin/organizations" withOrg withAdmin submitLabel="Criar administradora" successMessage="Administradora criada!" />
      </section>

      <section className={cardCss}>
        <h2 className={h2Css}>Novo condomínio autogerido</h2>
        <p className={mutedCss}>Sem administradora: quem cuida é o administrador do próprio condomínio.</p>
        <CreateCondoForm endpoint="/api/admin/condos" withAdmin submitLabel="Criar condomínio" successMessage="Condomínio criado!" />
      </section>

      <CondoList condos={condos} currentCondoId={session.condoId} tagOf={(id) => tags.get(id)} />

      <Pagination pathname="/admin/condos" params={{}} pagination={pagination} />
    </div>
  )
}
