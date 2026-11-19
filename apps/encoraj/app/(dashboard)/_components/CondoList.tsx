import type { ObjectId } from 'mongodb'
import { css } from '@/styled-system/css'
import { packages, residents, users, type CondominiumDoc } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { fmtDate } from '@/lib/date/tz'
import EnterCondoButton from './EnterCondoButton'

type CountRow = { _id: ObjectId; total: number }
const toMap = (rows: CountRow[]) => new Map(rows.map((row) => [row._id.toString(), row.total]))

interface CondoListProps {
  condos: Array<Pick<CondominiumDoc, 'name' | 'created_at'> & { _id: ObjectId }>
  /** Condomínio em que a sessão está agora */
  currentCondoId: string
  /** Linha extra por condomínio (ex.: a administradora, ou "Autogerido") */
  tagOf?: (id: string) => string | undefined
}

/**
 * Lista de condomínios com os números de cada um e o botão "Entrar". Quem chama já
 * decidiu QUAIS condomínios a pessoa pode ver (todos, para o super admin; os da
 * administradora, para o admin dela) — este componente não filtra nada.
 */
export default async function CondoList({ condos, currentCondoId, tagOf }: CondoListProps) {
  const ids = condos.map((condo) => condo._id)
  const [active, delivered] = await Promise.all([getStatus('active'), getStatus('delivered')])
  const countBy = (match: object) => [{ $match: { condo_id: { $in: ids }, ...match } }, { $group: { _id: '$condo_id', total: { $sum: 1 } } }]
  const [userCounts, residentCounts, openCounts] = await Promise.all([
    (await users()).aggregate<CountRow>(countBy({ status_id: active._id })).toArray().then(toMap),
    (await residents()).aggregate<CountRow>(countBy({ status_id: active._id })).toArray().then(toMap),
    (await packages()).aggregate<CountRow>(countBy({ status_id: { $ne: delivered._id } })).toArray().then(toMap),
  ])
  const n = (map: Map<string, number>, id: string) => (map.get(id) ?? 0).toLocaleString('pt-BR')

  return (
    <section className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
      {condos.map((condo) => {
        const id = condo._id.toString()
        const tag = tagOf?.(id)
        return (
          <article
            key={id}
            className={css({
              bg: 'white',
              border: '1px solid',
              borderColor: 'gray.200',
              borderRadius: 'lg',
              p: { base: '4', md: '5' },
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '3',
              _dark: { bg: 'gray.900', borderColor: 'gray.700' },
            })}
          >
            <div className={css({ display: 'flex', flexDir: 'column', gap: '1', minW: '0', flex: 1 })}>
              <span className={css({ fontWeight: 'semibold', color: 'gray.900', wordBreak: 'break-word', _dark: { color: 'gray.50' } })}>
                {condo.name}
              </span>
              {tag && (
                <span className={css({ fontSize: 'xs', fontWeight: 'medium', color: 'blue.600', _dark: { color: 'blue.400' } })}>{tag}</span>
              )}
              <span className={css({ fontSize: 'xs', color: 'gray.500', _dark: { color: 'gray.400' } })}>
                {n(userCounts, id)} usuários · {n(residentCounts, id)} moradores · {n(openCounts, id)} encomendas aguardando · criado em{' '}
                {fmtDate(condo.created_at)}
              </span>
            </div>
            {id === currentCondoId ? (
              <span className={css({ fontSize: 'xs', fontWeight: 'semibold', px: '2.5', py: '1', borderRadius: 'full', bg: 'green.100', color: 'green.800', _dark: { bg: 'green.900', color: 'green.200' } })}>
                Você está aqui
              </span>
            ) : (
              <EnterCondoButton id={id} />
            )}
          </article>
        )
      })}
    </section>
  )
}
