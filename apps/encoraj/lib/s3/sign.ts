import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, S3_BUCKET } from './client'
import { s3KeyFromUrl } from './upload'

/** Validade do link assinado. Quem recebe o HTML tem esse tempo para carregar a imagem. */
const EXPIRES_IN_SECONDS = 60 * 60

/**
 * Troca a URL canônica gravada no banco por um link assinado e temporário.
 * Funciona com o bucket público ou privado — é o que permite fechar o bucket sem
 * mexer em mais nada. URL que não é do nosso bucket (ou vazia) volta como veio.
 *
 * Usar em TODO lugar que entrega uma URL de imagem ao navegador.
 */
export async function signS3Url(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  const key = s3KeyFromUrl(url)
  if (!key) return url

  return getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), {
    expiresIn: EXPIRES_IN_SECONDS,
  })
}
