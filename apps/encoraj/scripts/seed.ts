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
    // Migrate active:boolean → status_id if needed
    if ('active' in condo) {
      await condos.updateOne(
        { _id: condo._id },
        { $set: { status_id: activeStatusId }, $unset: { active: '' } },
      )
      console.log('✅ Condomínio migrado: active → status_id')
    } else {
      console.log(`⚠️  Condomínio "${CONDO.slug}" já existe — usando existente.`)
    }
  }

  const condoId = condo._id as ObjectId

  // ── Admin ───────────────────────────────────────────────────────────────
  const col = db.collection('users')
  await col.createIndex({ email: 1 })

  const existing = await col.findOne({ email: ADMIN.email })

  if (existing) {
    const updates: Record<string, unknown> = {}
    if (!existing.condo_id) updates.condo_id = condoId
    if (!existing.role_id) updates.role_id = adminRoleId
    if (!existing.status_id) updates.status_id = activeStatusId

    if (Object.keys(updates).length > 0) {
      const unsets: Record<string, ''> = {}
      if ('role' in existing) unsets.role = ''
      if ('active' in existing) unsets.active = ''

      await col.updateOne(
        { email: ADMIN.email },
        {
          $set: updates,
          ...(Object.keys(unsets).length > 0 ? { $unset: unsets } : {}),
        },
      )
      console.log('✅ Admin atualizado:', Object.keys(updates).join(', '))
    } else {
      console.log('⚠️  Usuário admin já existe e está atualizado — pulando.')
    }
  } else {
    const password_hash = await bcrypt.hash(ADMIN.password, 12)
    await col.insertOne({
      condo_id: condoId,
      name: ADMIN.name,
      email: ADMIN.email,
      password_hash,
      role_id: adminRoleId,
      status_id: activeStatusId,
      created_at: new Date(),
    })
    console.log('✅ Admin criado!')
    console.log(`   Email: ${ADMIN.email}`)
    console.log(`   Senha: ${ADMIN.password}`)
    console.log('   ⚠️  Altere a senha após o primeiro acesso.')
  }

  // ── Migrar residents existentes ──────────────────────────────────────────
  const deletedDoc = await statusesCol.findOne({ name: 'deleted' })
  const deletedStatusId = deletedDoc!._id as ObjectId

  const residentsCol = db.collection('residents')

  const activeResidents = await residentsCol.countDocuments({ active: true })
  const inactiveResidents = await residentsCol.countDocuments({ active: false })

  if (activeResidents > 0) {
    await residentsCol.updateMany(
      { active: true },
      { $set: { status_id: activeStatusId }, $unset: { active: '' } },
    )
    console.log(`✅ ${activeResidents} morador(es) migrado(s): active:true → status_id:active`)
  }

  if (inactiveResidents > 0) {
    await residentsCol.updateMany(
      { active: false },
      { $set: { status_id: deletedStatusId }, $unset: { active: '' } },
    )
    console.log(`✅ ${inactiveResidents} morador(es) migrado(s): active:false → status_id:deleted`)
  }

  await client.close()
  console.log('✅ Seed concluído.')
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
