import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import ResidentForm from '../../_components/ResidentForm'

interface EditResidentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditResidentPage({ params }: EditResidentPageProps) {
  const { id } = await params

  if (!ObjectId.isValid(id)) notFound()

  const col = await residents()
  const { _id: activeStatusId } = await getStatus('active')
  const resident = await col.findOne({ _id: new ObjectId(id), status_id: activeStatusId })

  if (!resident) notFound()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <Link
          href="/residents"
          className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' }, _dark: { color: 'blue.400' } })}
        >
          ← Moradores
        </Link>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '2', _dark: { color: 'gray.50' } })}>
          Editar morador
        </h1>
      </div>

      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          p: { base: '4', md: '6' },
          _dark: { bg: 'gray.900', borderColor: 'gray.700' },
        })}
      >
        <ResidentForm
          id={id}
          defaultValues={{
            name: resident.name,
            apartment: resident.apartment,
            bloco: resident.bloco,
            whatsapp: resident.whatsapp,
          }}
        />
      </div>
    </div>
  )
}
