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
  role: 'admin' as const,
}

async function seed() {
  const client = new MongoClient(uri!)
  await client.connect()
  console.log('✅ Conectado ao MongoDB')

  const db = client.db()

  // ── Condomínio ──────────────────────────────────────────────────────────
  const condos = db.collection('condominiums')
  await condos.createIndex({ slug: 1 }, { unique: true })

  let condo = await condos.findOne({ slug: CONDO.slug })
  if (!condo) {
    const result = await condos.insertOne({
      name: CONDO.name,
      slug: CONDO.slug,
      active: true,
      created_at: new Date(),
    })
    condo = { _id: result.insertedId, ...CONDO, active: true, created_at: new Date() }
    console.log(`✅ Condomínio criado: ${CONDO.name} (slug: ${CONDO.slug})`)
  } else {
    console.log(`⚠️  Condomínio "${CONDO.slug}" já existe — usando existente.`)
  }

  const condoId = condo._id as ObjectId

  // ── Admin ───────────────────────────────────────────────────────────────
  const col = db.collection('users')
  await col.createIndex({ email: 1 }, { unique: true })

  const existing = await col.findOne({ email: ADMIN.email })

  if (existing) {
    if (!existing.condo_id) {
      await col.updateOne({ email: ADMIN.email }, { $set: { condo_id: condoId } })
      console.log('✅ Admin atualizado com condo_id.')
    } else {
      console.log('⚠️  Usuário admin já existe com condo_id — pulando.')
    }
  } else {
    const password_hash = await bcrypt.hash(ADMIN.password, 12)
    await col.insertOne({
      condo_id: condoId,
      name: ADMIN.name,
      email: ADMIN.email,
      password_hash,
      role: ADMIN.role,
      active: true,
      created_at: new Date(),
    })
    console.log('✅ Admin criado!')
    console.log(`   Email: ${ADMIN.email}`)
    console.log(`   Senha: ${ADMIN.password}`)
    console.log('   ⚠️  Altere a senha após o primeiro acesso.')
  }

  await client.close()
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
