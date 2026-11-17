import { MongoMemoryServer } from 'mongodb-memory-server'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}

/** Sobe um MongoDB real em memória para a suíte inteira. */
export default async function globalSetup(project: TestProject) {
  const mongod = await MongoMemoryServer.create()
  project.provide('mongoUri', mongod.getUri())

  return async () => {
    await mongod.stop()
  }
}
