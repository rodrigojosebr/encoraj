/**
 * Reduz a foto no navegador antes do upload.
 *
 * Câmera de celular gera 3–12 MB; a Vercel recusa corpo acima de ~4,5 MB e o OCR não
 * precisa de mais que ~1600 px. Qualquer falha (formato que o navegador não decodifica,
 * canvas indisponível) devolve o arquivo original — a compressão nunca bloqueia o envio.
 *
 * Só roda no cliente (usa createImageBitmap e canvas).
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  try {
    // Respeita a orientação EXIF: foto em pé continua em pé depois de passar pelo canvas
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    // Se não ficou menor (imagem já pequena e bem comprimida), manda a original
    if (!blob || blob.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
