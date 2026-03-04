import Link from 'next/link'
import { residents } from '@/lib/db/collections'
import { getStatusId } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { Button } from '@encoraj/ui'
import DeleteButton from './_components/DeleteButton'

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const col = await residents()

  const filter: Record<string, unknown> = { status_id: await getStatusId('active') }
  if (q?.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: 'i' } },
      { apartment: { $regex: q.trim(), $options: 'i' } },
    ]
  }

  const docs = await col.find(filter).sort({ name: 1 }).toArray()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      {/* Header */}
      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900' })}>
          Moradores
        </h1>
        <Link href="/residents/new">
          <Button size="sm">Novo morador</Button>
        </Link>
      </div>

      {/* Search */}
      <form method="GET">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nome ou apartamento…"
          className={css({
            w: 'full',
            px: '3',
            py: '2',
            border: '1px solid',
            borderColor: 'gray.300',
            borderRadius: 'md',
            fontSize: 'sm',
            outline: 'none',
            _focus: { borderColor: 'blue.500', ring: '1px', ringColor: 'blue.500' },
          })}
        />
      </form>

      {/* Table */}
      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          overflow: 'hidden',
        })}
      >
        {docs.length === 0 ? (
          <p className={css({ p: '8', textAlign: 'center', color: 'gray.500', fontSize: 'sm' })}>
            {q ? 'Nenhum morador encontrado para essa busca.' : 'Nenhum morador cadastrado ainda.'}
          </p>
        ) : (
          <table className={css({ w: 'full', borderCollapse: 'collapse' })}>
            <thead>
              <tr className={css({ bg: 'gray.50', borderBottom: '1px solid', borderColor: 'gray.200' })}>
                {['Nome', 'Apartamento', 'WhatsApp', 'Ações'].map((h) => (
                  <th
                    key={h}
                    className={css({
                      px: '4',
                      py: '3',
                      textAlign: 'left',
                      fontSize: 'xs',
                      fontWeight: 'semibold',
                      color: 'gray.500',
                      textTransform: 'uppercase',
                      letterSpacing: 'wide',
                    })}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((r) => (
                <tr
                  key={r._id!.toString()}
                  className={css({ borderBottom: '1px solid', borderColor: 'gray.100', _hover: { bg: 'gray.50' } })}
                >
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.900', fontWeight: 'medium' })}>
                    {r.name}
                  </td>
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600' })}>
                    {r.apartment}
                  </td>
                  <td className={css({ px: '4', py: '3', fontSize: 'sm', color: 'gray.600' })}>
                    {r.whatsapp}
                  </td>
                  <td className={css({ px: '4', py: '3', display: 'flex', gap: '2' })}>
                    <Link href={`/residents/${r._id!.toString()}/edit`}>
                      <Button variant="ghost" intent="secondary" size="sm">Editar</Button>
                    </Link>
                    <DeleteButton id={r._id!.toString()} name={r.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
