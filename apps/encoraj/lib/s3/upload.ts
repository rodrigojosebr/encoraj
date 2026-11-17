import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET, S3_REGION } from './client'

/**
 * URL canônica de uma chave do bucket. É ISTO que fica gravado no banco — também usada
 * para validar que uma URL recebida é nossa. Para exibir, passar por signS3Url().
 */
export function s3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}

/** Chave do objeto a partir da URL canônica; null se a URL não é do nosso bucket. */
export function s3KeyFromUrl(url: string | null | undefined): string | null {
  const prefix = s3PublicUrl('')
  if (!url || !url.startsWith(prefix)) return null
  return url.slice(prefix.length).split('?')[0] || null
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  return s3PublicUrl(key)
}
