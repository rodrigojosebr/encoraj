import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error('MONGODB_URI não definido nas variáveis de ambiente')
}

// Em dev, reutiliza a conexão entre hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
}

const client = globalThis._mongoClient ?? new MongoClient(uri)

if (process.env.NODE_ENV !== 'production') {
  globalThis._mongoClient = client
}

export async function getDb(): Promise<Db> {
  await client.connect()
  return client.db()
}
