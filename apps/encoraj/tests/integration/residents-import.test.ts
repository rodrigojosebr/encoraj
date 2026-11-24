import { describe, expect, it } from 'vitest'
import { POST as importRoute } from '@/app/api/residents/import/route'
import { GET as templateRoute } from '@/app/api/residents/import/template/route'
import { auditLogs, residents } from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { MAX_SHEET_BYTES } from '@/lib/residents/sheet'
import { createCondo, createResident, createUser, formRequest, jsonRequest, loginAs } from '../helpers/factory'

const HEADER = 'Nome;Bloco;Apartamento;WhatsApp'

function sendFile(content: string, mode?: 'check' | 'import') {
  const form = new FormData()
  form.set('file', new Blob([content], { type: 'text/csv' }), 'moradores.csv')
  if (mode) form.set('mode', mode)
  return importRoute(formRequest(form))
}

/** Planilha com os títulos do modelo e uma linha por morador. */
const send = (lines: string[], mode?: 'check' | 'import') => sendFile([HEADER, ...lines].join('\n'), mode)

const countResidents = async () => (await residents()).countDocuments({})

describe('GET /api/residents/import/template', () => {
  it('entrega o modelo como download, só com os títulos das colunas', async () => {
    await loginAs(await createUser(await createCondo(), 'sindico'))

    const res = await templateRoute()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="modelo-moradores.csv"')
    // começa com BOM, para o Excel abrir em UTF-8
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes)).toBe('"Nome";"Bloco (opcional)";"Apartamento";"WhatsApp (DDD + número)"')
  })
})

describe('POST /api/residents/import — conferir', () => {
  it('diz quem entra, quem fica de fora e o que está errado, sem gravar nada', async () => {
    const condo = await createCondo()
    await createResident(condo, 'Ana Souza') // Bloco A · Apto 101
    await loginAs(await createUser(condo, 'sindico'))

    const res = await send([
      'ANA SOUZÁ;a;0101;11999990001', // já cadastrada: maiúscula, acento e zero à esquerda não enganam
      'Bia Lima;A;102;11999990002',
      'bia  lima;A;102;11999990002', // repetida na planilha
      'Caio Reis;;103;123',
    ])

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      to_create: 1,
      sample: [{ line: 3, name: 'Bia Lima', unit: 'Bloco A · Apto 102', whatsapp: '+5511999990002' }],
      skipped_count: 2,
      skipped: [
        { line: 2, name: 'ANA SOUZÁ', unit: 'Bloco a · Apto 0101', note: 'Já cadastrado.' },
        { line: 4, name: 'bia lima', unit: 'Bloco A · Apto 102', note: 'Repetido na planilha.' },
      ],
      error_count: 1,
      errors: [{ line: 5, message: 'WhatsApp "123": use DDD + número, 11 dígitos (ex.: 11999990000).' }],
    })
    expect(await countResidents()).toBe(1)
    expect(await (await auditLogs()).countDocuments({})).toBe(0)
  })

  it('"check" explícito e modo desconhecido também só conferem', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))

    for (const mode of ['check', 'qualquer'] as const) {
      const res = await send(['Ana Souza;;1;11999990001'], mode as 'check')
      expect(await res.json()).toMatchObject({ to_create: 1, skipped_count: 0, error_count: 0 })
    }
    expect(await countResidents()).toBe(0)
  })

  it('morador de outro condomínio ou excluído não conta como cadastrado', async () => {
    const [condo, other] = [await createCondo(), await createCondo()]
    await createResident(other, 'Ana Souza')
    const removed = await createResident(condo, 'Bia Lima')
    await (await residents()).updateOne({ _id: removed._id }, { $set: { status_id: (await getStatus('deleted'))._id } })
    await loginAs(await createUser(condo, 'sindico'))

    const res = await send(['Ana Souza;A;101;11999990001', 'Bia Lima;A;101;11999990002'])
    expect(await res.json()).toMatchObject({ to_create: 2, skipped_count: 0 })
  })

  it('a resposta leva no máximo 100 linhas de cada lista e 5 de amostra; o total vai inteiro', async () => {
    await loginAs(await createUser(await createCondo(), 'sindico'))

    const good = Array.from({ length: 8 }, (_, i) => `Morador ${i};;${i};11999990001`)
    const repeated = Array.from({ length: 101 }, () => 'Morador 0;;0;11999990001')
    const broken = Array.from({ length: 101 }, (_, i) => `Quebrado ${i};;${i};`)

    const body = await (await send([...good, ...repeated, ...broken])).json()
    expect(body).toMatchObject({ to_create: 8, skipped_count: 101, error_count: 101 })
    expect(body.sample).toHaveLength(5)
    expect(body.skipped).toHaveLength(100)
    expect(body.errors).toHaveLength(100)
  })
})

describe('POST /api/residents/import — importar', () => {
  it('cadastra no condomínio da sessão, com registro de quem importou, e pula quem já existe', async () => {
    const [condo, other] = [await createCondo(), await createCondo()]
    await createResident(condo, 'Ana Souza')
    await createResident(other, 'Bia Lima')
    const sindico = await createUser(condo, 'sindico')
    await loginAs(sindico)

    const lines = ['Ana Souza;A;101;11999990001', 'Bia Lima;A;101;(11) 99999-0002', 'Caio Reis;;7;5511999990003']
    const res = await send(lines, 'import')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ created: 2, skipped: 1 })

    const col = await residents()
    const created = await col.find({ condo_id: condo._id, name: { $in: ['Bia Lima', 'Caio Reis'] } }).sort({ name: 1 }).toArray()
    expect(created).toHaveLength(2)
    expect(created[0]).toMatchObject({ name: 'Bia Lima', block: 'A', apartment: '101', whatsapp: '+5511999990002', created_by: sindico._id })
    expect(created[1]).toMatchObject({ name: 'Caio Reis', apartment: '7', whatsapp: '+5511999990003', created_by: sindico._id })
    expect(created[1]).not.toHaveProperty('block') // sem bloco: o campo não existe, em vez de ficar vazio
    const active = await getStatus('active')
    for (const doc of created) expect(doc.status_id.equals(active._id)).toBe(true)
    expect(await col.countDocuments({ condo_id: other._id })).toBe(1)

    const logs = await (await auditLogs()).find({ condo_id: condo._id }).toArray()
    expect(logs).toHaveLength(2)
    for (const doc of created) {
      expect(logs.find((log) => log.entity_id.equals(doc._id))).toMatchObject({
        entity: 'residents',
        action: 'created',
        actor_id: sindico._id,
        actor_name: sindico.name,
        after: { name: doc.name, whatsapp: doc.whatsapp },
      })
    }

    // reenviar a mesma planilha não duplica ninguém
    expect(await (await send(lines, 'import')).json()).toEqual({ created: 0, skipped: 3 })
    expect(await col.countDocuments({ condo_id: condo._id })).toBe(3)
    expect(await (await auditLogs()).countDocuments({})).toBe(2)
  })

  it('planilha com erro em qualquer linha não importa nada', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))

    const res = await send(['Bia Lima;A;102;11999990002', 'Caio Reis;;103;123'], 'import')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A planilha tem erros. Envie de novo para conferir antes de importar.' })
    expect(await countResidents()).toBe(0)
  })
})

describe('POST /api/residents/import — arquivo recusado', () => {
  it('sem arquivo, grande demais, que não é CSV, sem as colunas ou sem moradores → 400, nada gravado', async () => {
    await loginAs(await createUser(await createCondo(), 'sindico'))
    const refused = async (res: Response) => {
      expect(res.status).toBe(400)
      return (await res.json()).error as string
    }

    expect(await refused(await importRoute(formRequest(new FormData())))).toBe('Arquivo não enviado.')
    expect(await refused(await importRoute(jsonRequest('POST', { file: 'x' })))).toBe('Arquivo não enviado.') // corpo que nem é multipart
    expect(await refused(await sendFile('x'.repeat(MAX_SHEET_BYTES + 1), 'import'))).toBe('Arquivo muito grande (máx. 1 MB).')
    expect(await refused(await sendFile('PK\u0003\u0004\u0014\u0000\u0006\u0000', 'import'))).toContain('não é CSV')
    expect(await refused(await sendFile('Nome;Endereço\nAna;Rua X', 'import'))).toContain('Não encontrei as colunas')
    expect(await refused(await send([], 'import'))).toContain('não tem nenhum morador')

    expect(await countResidents()).toBe(0)
  })
})
