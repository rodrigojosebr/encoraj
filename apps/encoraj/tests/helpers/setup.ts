import { afterAll, beforeAll, beforeEach, inject, vi } from 'vitest'
import { MongoClient } from 'mongodb'
import { requestState, resetRequest } from './request-state'

// ── Ambiente: precisa existir ANTES de qualquer módulo do app ser importado ──
const uri = new URL(inject('mongoUri'))
uri.pathname = `/encoraj_test_${process.env.VITEST_POOL_ID ?? '0'}`
process.env.MONGODB_URI = uri.toString()
process.env.JWT_SECRET = 'segredo-somente-de-teste-0123456789abcdef'
process.env.APP_URL = 'http://localhost:3000'
delete process.env.GEMINI_API_KEY

// ── Mocks globais ───────────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
  headers: async () => requestState.headers,
  cookies: async () => ({
    get: (name: string) => {
      const value = requestState.cookies.get(name)
      return value === undefined ? undefined : { name, value }
    },
  }),
}))

// Nada sai para a AWS: o S3 real é trocado por um cliente que só aceita o envio
vi.mock('@/lib/s3/client', () => ({
  s3: { send: vi.fn(async () => ({})) },
  S3_BUCKET: 'test-bucket',
  S3_REGION: 'us-east-1',
}))

// Link assinado previsível: https://signed.test/<chave>?X-Amz-Signature=teste
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client: unknown, command: { input: { Key: string } }) =>
    `https://signed.test/${command.input.Key}?X-Amz-Signature=teste`,
  ),
}))

// ── Banco ───────────────────────────────────────────────────────────────────
const STATUSES = [
  { name: 'active', label: 'Ativo' },
  { name: 'inactive', label: 'Inativo' },
  { name: 'deleted', label: 'Excluído' },
  { name: 'arrived', label: 'Chegou' },
  { name: 'notified', label: 'Notificado' },
  { name: 'delivered', label: 'Retirado' },
]
const ROLES = [
  { name: 'admin', label: 'Administrador' },
  { name: 'zelador', label: 'Zelador' },
  { name: 'porteiro', label: 'Porteiro' },
  { name: 'sindico', label: 'Síndico' },
  { name: 'morador', label: 'Morador' },
]
// statuses e roles nunca são apagados: os _id ficam estáveis e o cache do app continua válido
const VOLATILE = [
  'condominiums',
  'users',
  'residents',
  'packages',
  'audit_logs',
  'rate_limits',
  'password_reset_tokens',
]

const client = new MongoClient(process.env.MONGODB_URI)

beforeAll(async () => {
  await client.connect()
  const db = client.db()
  const now = new Date()

  for (const s of STATUSES) {
    await db
      .collection('statuses')
      .updateOne({ name: s.name }, { $setOnInsert: { ...s, created_at: now } }, { upsert: true })
  }
  const active = await db.collection('statuses').findOne({ name: 'active' })
  for (const r of ROLES) {
    await db
      .collection('roles')
      .updateOne(
        { name: r.name },
        { $setOnInsert: { ...r, status_id: active!._id, created_at: now } },
        { upsert: true },
      )
  }
})

beforeEach(async () => {
  const db = client.db()
  await Promise.all(VOLATILE.map((name) => db.collection(name).deleteMany({})))
  resetRequest()
})

afterAll(async () => {
  await client.close()
})
