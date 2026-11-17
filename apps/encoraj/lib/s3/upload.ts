import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET, S3_REGION } from './client'

/** URL pública de uma chave do bucket — também usada para validar que uma URL recebida é nossa. */
export function s3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
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
