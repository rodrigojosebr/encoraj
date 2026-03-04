import { config } from 'dotenv'
config({ path: '.env.local' })
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI não definido. Crie o arquivo .env.local primeiro.')
  process.exit(1)
}

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
  const col = db.collection('users')

  // Índice único por email
  await col.createIndex({ email: 1 }, { unique: true })

  const existing = await col.findOne({ email: ADMIN.email })
  if (existing) {
    console.log('⚠️  Usuário admin já existe — pulando.')
    await client.close()
    return
  }

  const password_hash = await bcrypt.hash(ADMIN.password, 12)
  await col.insertOne({
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

  await client.close()
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
