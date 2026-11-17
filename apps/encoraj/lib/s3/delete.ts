import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET } from './client'
import { s3KeyFromUrl } from './upload'

const BATCH = 1000 // limite do DeleteObjects

async function deleteKeys(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += BATCH) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: keys.slice(i, i + BATCH).map((Key) => ({ Key })), Quiet: true },
      }),
    )
  }
}

/** Apaga do bucket os objetos dessas URLs canônicas. URLs de fora do bucket são ignoradas. */
export async function deleteS3Urls(urls: Array<string | null | undefined>): Promise<number> {
  const keys = [...new Set(urls.map(s3KeyFromUrl).filter((key): key is string => !!key))]
  await deleteKeys(keys)
  return keys.length
}

/** Apaga tudo que está sob um prefixo (ex.: `condos/{id}/`). Devolve quantos objetos saíram. */
export async function deleteS3Prefix(prefix: string): Promise<number> {
  if (!/^condos\/[0-9a-f]{24}\//.test(prefix)) {
    throw new Error(`Prefixo recusado para exclusão em massa: ${prefix}`)
  }

  let deleted = 0
  let token: string | undefined
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, ContinuationToken: token }),
    )
    const keys = (page.Contents ?? []).map((o) => o.Key).filter((key): key is string => !!key)
    await deleteKeys(keys)
    deleted += keys.length
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  return deleted
}
