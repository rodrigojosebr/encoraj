import { residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { css } from '@/styled-system/css'
import { headers } from 'next/headers'
import { ObjectId } from 'mongodb'
import NewPackageForm from './_components/NewPackageForm'

export default async function NewPackagePage() {
  const headersList = await headers()
  const condoId = headersList.get('x-condo-id')!

  const activeStatus = await getStatus('active')
  const col = await residents()
  const docs = await col
    .find({ condo_id: new ObjectId(condoId), status_id: activeStatus._id })
    .sort({ name: 1 })
    .toArray()

  const options = docs.map((r) => ({
    value: r._id!.toString(),
    label: r.bloco
      ? `${r.name} — Bloco ${r.bloco}, Apto ${r.apartment}`
      : `${r.name} — Apto ${r.apartment}`,
  }))

  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '6', maxW: '560px' })}>
      <h1 className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'gray.900', _dark: { color: 'gray.50' } })}>
        Registrar chegada
      </h1>

      <div className={css({
        bg: 'white',
        border: '1px solid',
        borderColor: 'gray.200',
        borderRadius: 'xl',
        p: { base: '4', md: '6' },
        _dark: { bg: 'gray.900', borderColor: 'gray.700' },
      })}>
        <NewPackageForm residents={options} />
      </div>
    </div>
  )
}
