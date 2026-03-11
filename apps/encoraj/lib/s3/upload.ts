import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, S3_BUCKET, S3_REGION } from './client'

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
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
}
