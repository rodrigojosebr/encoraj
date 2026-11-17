/**
 * Conferência do banco antes de lançar. SOMENTE LEITURA — não altera nada.
 *
 * Uso (de apps/encoraj):
 *   yarn preflight                          → banco do .env.local
 *   MONGODB_URI="<uri de produção>" yarn preflight
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

const SEED_EMAIL = 'admin@encoraj.com'
const SEED_PASSWORD = 'admin123'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('❌ MONGODB_URI não definido.')
  process.exit(1)
}

let problems = 0
const ok = (msg: string) => console.log(`✅ ${msg}`)
const warn = (msg: string) => console.log(`⚠️  ${msg}`)
const fail = (msg: string) => {
  problems++
  console.log(`❌ ${msg}`)
}

async function main() {
  const client = new MongoClient(uri!)
  await client.connect()
  const db = client.db()
  console.log(`Banco: ${db.databaseName}\n`)

  const active = await db.collection('statuses').findOne({ name: 'active' })
  const delivered = await db.collection('statuses').findOne({ name: 'delivered' })
  if (!active || !delivered) {
    fail('Collection "statuses" sem active/delivered — o seed de statuses/roles não rodou neste banco.')
    await client.close()
    return
  }

  // 1. Admin do seed
  const seedAdmin = await db
    .collection('users')
    .findOne({ email: SEED_EMAIL }, { collation: { locale: 'en', strength: 2 } })
  if (!seedAdmin) {
    ok(`Não existe usuário ${SEED_EMAIL}.`)
  } else if (!active._id.equals(seedAdmin.status_id)) {
    ok(`${SEED_EMAIL} existe, mas está desativado.`)
  } else if (await bcrypt.compare(SEED_PASSWORD, seedAdmin.password_hash)) {
    fail(`${SEED_EMAIL} está ATIVO com a senha padrão do seed (publicada no README). Trocar a senha ou desativar agora.`)
  } else {
    warn(`${SEED_EMAIL} está ativo, com senha diferente da padrão. Confirme que é uma conta de verdade.`)
  }

  // 2. Email ativo duplicado (ignora maiúsculas) — impede o índice único e confunde o login
  const duplicates = await db
    .collection('users')
    .aggregate<{ _id: string; count: number; condos: unknown[] }>([
      { $match: { status_id: active._id } },
      { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, condos: { $addToSet: '$condo_id' } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray()
  if (duplicates.length === 0) {
    ok('Nenhum email ativo duplicado.')
  } else {
    fail(`${duplicates.length} email(s) ativo(s) em mais de uma conta:`)
    for (const d of duplicates) console.log(`     ${d._id} — ${d.count} contas em ${d.condos.length} condomínio(s)`)
    console.log('     Desative a conta antiga de cada um; enquanto isso o login usa a conta mais recente cuja senha confere.')
  }

  // 3. Índice único de email
  const userIndexes = await db.collection('users').indexes()
  if (userIndexes.some((i) => i.name === 'email_active_unique')) {
    ok('Índice único de email (email_active_unique) existe.')
  } else {
    warn('Índice email_active_unique ainda não existe — é criado no primeiro request após o deploy, se não houver duplicados.')
  }

  // 4. Emails com maiúscula (legado): funcionam no login, mas vale normalizar
  const mixedCase = await db.collection('users').countDocuments({ email: { $regex: '[A-Z]' } })
  if (mixedCase === 0) ok('Todos os emails estão em minúsculas.')
  else warn(`${mixedCase} usuário(s) com maiúscula no email (login funciona; "esqueci minha senha" também).`)

  // 5. Links públicos antigos
  const legacyOpen = await db
    .collection('packages')
    .countDocuments({ public_token: { $exists: false }, status_id: { $ne: delivered._id } })
  if (legacyOpen === 0) ok('Nenhuma encomenda em aberto usando o link público antigo (por ObjectId).')
  else warn(`${legacyOpen} encomenda(s) em aberto ainda aceitam o link antigo /p/{id}; some conforme forem retiradas.`)

  // 6. Volume
  const [condos, users, residents, packages] = await Promise.all([
    db.collection('condominiums').countDocuments({}),
    db.collection('users').countDocuments({ status_id: active._id }),
    db.collection('residents').countDocuments({ status_id: active._id }),
    db.collection('packages').countDocuments({}),
  ])
  console.log(`\nVolume: ${condos} condomínio(s), ${users} usuário(s) ativo(s), ${residents} morador(es) ativo(s), ${packages} encomenda(s).`)

  // 7. Variáveis de ambiente deste processo (só presença, nunca o valor)
  console.log('\nVariáveis de ambiente (as deste terminal — confira também na Vercel):')
  for (const name of ['JWT_SECRET', 'APP_URL', 'AWS_S3_BUCKET', 'GEMINI_API_KEY', 'SMTP_HOST', 'SMTP_FROM', 'LEGAL_COMPANY_NAME', 'LEGAL_CONTACT_EMAIL']) {
    console.log(`  ${process.env[name] ? '✅' : '⚠️ '} ${name}${process.env[name] ? '' : ' não definida'}`)
  }

  await client.close()
}

main()
  .then(() => {
    console.log(problems === 0 ? '\nNenhum bloqueio encontrado.' : `\n${problems} bloqueio(s) encontrado(s).`)
    process.exit(problems === 0 ? 0 : 1)
  })
  .catch((err) => {
    console.error('❌ Falha ao conferir:', err)
    process.exit(1)
  })
