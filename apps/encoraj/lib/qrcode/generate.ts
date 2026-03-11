import QRCode from 'qrcode'
import { uploadToS3 } from '@/lib/s3/upload'

export async function generateAndUploadQRCode(
  packageId: string,
  condoId: string,
): Promise<string> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const content = `${appUrl}/packages/${packageId}`
  const pngBuffer = await QRCode.toBuffer(content, { type: 'png', width: 400 })
  const key = `condos/${condoId}/packages/qrcodes/${packageId}.png`
  return uploadToS3(Buffer.from(pngBuffer), key, 'image/png')
}
