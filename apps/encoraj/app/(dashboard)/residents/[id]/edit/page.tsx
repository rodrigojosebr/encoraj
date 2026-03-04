import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ObjectId } from 'mongodb'
import { residents } from '@/lib/db/collections'
import { css } from '@/styled-system/css'
import ResidentForm from '../../_components/ResidentForm'

interface EditResidentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditResidentPage({ params }: EditResidentPageProps) {
  const { id } = await params

  if (!ObjectId.isValid(id)) notFound()

  const col = await residents()
  const resident = await col.findOne({ _id: new ObjectId(id), active: true })

  if (!resident) notFound()

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6' })}>
      <div>
        <Link
          href="/residents"
          className={css({ fontSize: 'sm', color: 'blue.600', textDecoration: 'none', _hover: { textDecoration: 'underline' } })}
        >
          ← Moradores
        </Link>
        <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', mt: '2' })}>
          Editar morador
        </h1>
      </div>

      <div
        className={css({
          bg: 'white',
          border: '1px solid',
          borderColor: 'gray.200',
          borderRadius: 'lg',
          p: '6',
        })}
      >
        <ResidentForm
          id={id}
          defaultValues={{
            name: resident.name,
            apartment: resident.apartment,
            whatsapp: resident.whatsapp,
          }}
        />
      </div>
    </div>
  )
}
