export const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB (a Vercel corta o body em ~4,5 MB antes disso)

export interface ImageUpload {
  buffer: Buffer
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  ext: 'jpg' | 'png' | 'webp'
}

/** Identifica o formato pelos primeiros bytes — não confia no `file.type` enviado pelo cliente. */
function sniff(buffer: Buffer): Pick<ImageUpload, 'contentType' | 'ext'> | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: 'image/jpeg', ext: 'jpg' }
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { contentType: 'image/png', ext: 'png' }
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { contentType: 'image/webp', ext: 'webp' }
  }
  return null
}

/**
 * Lê o campo `file` de um multipart e valida tamanho e formato real.
 * Retorna `{ error }` com a mensagem pronta para o usuário quando inválido.
 */
export async function readImageUpload(
  formData: FormData,
): Promise<ImageUpload | { error: string }> {
  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) return { error: 'Arquivo não enviado.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Arquivo muito grande (máx 8 MB).' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const kind = sniff(buffer)
  if (!kind) return { error: 'Formato inválido. Use JPEG, PNG ou WebP.' }

  return { buffer, ...kind }
}
