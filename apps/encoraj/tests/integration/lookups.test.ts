import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { packages } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { getTodayRange } from '@/lib/date/tz'
import { formatUnit, getResidentMap, residentLabel } from '@/lib/residents/lookup'
import { getPackageStats } from '@/lib/packages/stats'
import { packageStatusOptions } from '@/lib/packages/filter'
import { createCondo, createPackage, createResident } from '../helpers/factory'

describe('unidade do morador', () => {
  it('mostra o bloco só quando há bloco', () => {
    expect(formatUnit({ apartment: '101', block: 'A' })).toBe('Bloco A · Apto 101')
    expect(formatUnit({ apartment: '7' })).toBe('Apto 7')
    expect(formatUnit({ apartment: '7', block: '  ' })).toBe('Apto 7')
    expect(residentLabel({ name: 'Ana', apartment: '101', block: 'A' })).toBe('Ana — Bloco A · Apto 101')
  })
})

describe('getResidentMap', () => {
  it('traz só moradores do condomínio pedido, sem repetir', async () => {
    const condo = await createCondo()
    const ana = await createResident(condo, 'Ana')
    const outsider = await createResident(await createCondo(), 'De fora')

    const map = await getResidentMap(condo._id, [ana._id, ana._id, outsider._id, new ObjectId()])
    expect([...map.keys()]).toEqual([ana._id.toString()])
    expect(map.get(ana._id.toString())).toMatchObject({ name: 'Ana', apartment: '101', block: 'A' })
    expect(map.get(ana._id.toString())).not.toHaveProperty('whatsapp') // só o que as telas mostram
  })

  it('lista vazia não consulta nada', async () => {
    expect((await getResidentMap(new ObjectId().toString(), [])).size).toBe(0)
  })
})

describe('getPackageStats', () => {
  it('conta chegadas e retiradas de hoje, em aberto e total, só do condomínio', async () => {
    const condo = await createCondo()
    const resident = await createResident(condo)
    const { today } = getTodayRange()
    const yesterday = new Date(today.getTime() - 60 * 60 * 1000)
    const delivered = await getStatus('delivered')
    const notified = await getStatus('notified')

    await createPackage(condo, resident._id) // chegou hoje, em aberto
    const old = await createPackage(condo, resident._id)
    await (await packages()).updateOne({ _id: old._id }, { $set: { arrived_at: yesterday, status_id: notified._id } })
    const done = await createPackage(condo, resident._id)
    await (await packages()).updateOne(
      { _id: done._id },
      { $set: { arrived_at: yesterday, status_id: delivered._id, delivered_at: new Date() } },
    )
    const other = await createCondo()
    await createPackage(other, (await createResident(other))._id)

    expect(await getPackageStats(condo._id.toString())).toEqual({ arrivedToday: 1, open: 2, deliveredToday: 1, total: 3 })
  })
})

describe('packageStatusOptions', () => {
  it('"Todos", "Em aberto" e um por status, com o rótulo do banco', async () => {
    expect(await packageStatusOptions()).toEqual([
      { label: 'Todos', value: '' },
      { label: 'Em aberto', value: 'open' },
      { label: 'Chegou', value: 'arrived' },
      { label: 'Notificado', value: 'notified' },
      { label: 'Retirado', value: 'delivered' },
    ])
  })
})
