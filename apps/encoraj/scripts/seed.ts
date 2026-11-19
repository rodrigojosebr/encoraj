import { config } from 'dotenv'
config({ path: '.env.local' })
import bcrypt from 'bcryptjs'
import { MongoClient, ObjectId } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI não definido. Crie o arquivo .env.local primeiro.')
  process.exit(1)
}

const CONDO = { name: 'Condomínio Demo', slug: 'demo' }

const ADMIN = {
  name: 'Administrador',
  email: 'admin@encoraj.com',
  password: 'admin123',
  role: 'admin',
}

const STATUSES = [
  { name: 'active',    label: 'Ativo' },
  { name: 'inactive',  label: 'Inativo' },
  { name: 'deleted',   label: 'Excluído' },
  { name: 'arrived',   label: 'Chegou' },
  { name: 'notified',  label: 'Notificado' },
  { name: 'delivered', label: 'Retirado' },
]

const ROLES = [
  { name: 'admin',    label: 'Administrador' },
  { name: 'zelador',  label: 'Zelador' },
  { name: 'porteiro', label: 'Porteiro' },
  { name: 'sindico',  label: 'Síndico' },
  { name: 'morador',  label: 'Morador' },
  // operador da plataforma — atribuída só por alteração direta no banco (ver CLAUDE.md)
  { name: 'superadmin', label: 'Super admin' },
  // admin de uma administradora — nasce junto com ela, criada pelo super admin
  { name: 'administradora', label: 'Administradora' },
]

async function seed() {
  const client = new MongoClient(uri!)
  await client.connect()
  console.log('✅ Conectado ao MongoDB')

  const db = client.db()

  // ── Statuses ─────────────────────────────────────────────────────────────
  const statusesCol = db.collection('statuses')
  await statusesCol.createIndex({ name: 1 }, { unique: true })

  for (const s of STATUSES) {
    await statusesCol.updateOne(
      { name: s.name },
      { $setOnInsert: { ...s, created_at: new Date() } },
      { upsert: true },
    )
  }
  console.log('✅ Statuses criados/verificados')

  const activeDoc = await statusesCol.findOne({ name: 'active' })
  const activeStatusId = activeDoc!._id as ObjectId

  // ── Roles ─────────────────────────────────────────────────────────────────
  const rolesCol = db.collection('roles')
  await rolesCol.createIndex({ name: 1 }, { unique: true })

  for (const r of ROLES) {
    await rolesCol.updateOne(
      { name: r.name },
      { $setOnInsert: { ...r, status_id: activeStatusId, created_at: new Date() } },
      { upsert: true },
    )
  }
  console.log('✅ Roles criados/verificados')

  const adminRoleDoc = await rolesCol.findOne({ name: 'admin' })
  const adminRoleId = adminRoleDoc!._id as ObjectId

  // ── Condomínio ──────────────────────────────────────────────────────────
  const condos = db.collection('condominiums')
  await condos.createIndex({ slug: 1 }, { unique: true })

  let condo = await condos.findOne({ slug: CONDO.slug })
  if (!condo) {
    const result = await condos.insertOne({
      name: CONDO.name,
      slug: CONDO.slug,
      status_id: activeStatusId,
      created_at: new Date(),
    })
    condo = { _id: result.insertedId, ...CONDO, status_id: activeStatusId, created_at: new Date() }
    console.log(`✅ Condomínio criado: ${CONDO.name} (slug: ${CONDO.slug})`)
  } else {
    console.log(`⚠️  Condomínio "${CONDO.slug}" já existe — usando existente.`)
  }

  const condoId = condo._id as ObjectId

  // ── Admin ───────────────────────────────────────────────────────────────
  const col = db.collection('users')

  if (await col.findOne({ email: ADMIN.email })) {
    console.log('⚠️  Usuário admin já existe — pulando.')
  } else {
    const password_hash = await bcrypt.hash(ADMIN.password, 12)
    await col.insertOne({
      condo_id: condoId,
      name: ADMIN.name,
      email: ADMIN.email,
      password_hash,
      // roles se somam; para virar super admin, acrescente a role direto no banco
      role_ids: [adminRoleId],
      status_id: activeStatusId,
      created_at: new Date(),
    })
    console.log('✅ Admin criado!')
    console.log(`   Email: ${ADMIN.email}`)
    console.log(`   Senha: ${ADMIN.password}`)
    console.log('   ⚠️  Altere a senha após o primeiro acesso.')
  }

  await client.close()
  console.log('✅ Seed concluído.')
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
