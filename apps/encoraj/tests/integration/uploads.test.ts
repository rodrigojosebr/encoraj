import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/gemini/ocr', () => ({ analyzePackageLabel: vi.fn() }))

import { POST as upload } from '@/app/api/upload/route'
import { POST as ocr } from '@/app/api/ocr/route'
import { POST as setCondoPhoto, DELETE as removeCondoPhoto } from '@/app/api/condo/photo/route'
import { POST as setMyPhoto, DELETE as removeMyPhoto } from '@/app/api/users/me/photo/route'
import { analyzePackageLabel } from '@/lib/gemini/ocr'
import { s3 } from '@/lib/s3/client'
import { condominiums, users } from '@/lib/db/collections'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE } from '@/lib/auth/cookies'
import { createCondo, createResident, createUser, formRequest, imageForm, jsonRequest, JPEG, loginAs, PNG } from '../helpers/factory'

const fakeImage = () => imageForm(new Uint8Array(new TextEncoder().encode('isto não é imagem')), 'image/jpeg')
const analyze = vi.mocked(analyzePackageLabel)
const s3Send = vi.mocked(s3.send)

beforeEach(() => {
  analyze.mockReset()
  s3Send.mockClear()
})

describe('POST /api/upload', () => {
  it('grava a foto na pasta do condomínio da sessão', async () => {
    const condo = await createCondo()
    await loginAs(await createUser(condo, 'porteiro'))

    const res = await upload(formRequest(imageForm(PNG, 'image/jpeg')))
    expect(res.status).toBe(200)
    const { url } = await res.json()
    expect(url).toMatch(
      new RegExp(`^https://test-bucket\\.s3\\.us-east-1\\.amazonaws\\.com/condos/${condo._id.toString()}/packages/photos/[0-9a-f-]{36}\\.png$`),
    )
    expect(s3Send).toHaveBeenCalledTimes(1)
  })

  it('recusa arquivo que não é imagem, sem enviar nada ao S3', async () => {
    await loginAs(await createUser(await createCondo(), 'admin'))
    expect((await upload(formRequest(fakeImage()))).status).toBe(400)
    expect((await upload(formRequest(new FormData()))).status).toBe(400)
    expect((await upload(jsonRequest('POST', { file: 'x' }))).status).toBe(400) // corpo que nem é multipart
    expect(s3Send).not.toHaveBeenCalled()
  })
})

describe('fotos de perfil e do condomínio', () => {
  it('foto do condomínio: grava, re-assina o cookie e remove', async () => {
    const condo = await createCondo()
    await loginAs(await createUser(condo, 'admin'))

    const res = await setCondoPhoto(formRequest(imageForm(JPEG)))
    expect(res.status).toBe(200)
    // Resposta: link assinado para exibir já. Banco e JWT: URL canônica, sem assinatura.
    const canonical = `https://test-bucket.s3.us-east-1.amazonaws.com/condos/${condo._id.toString()}/logo.jpg`
    expect((await res.json()).photo_url).toBe(`https://signed.test/condos/${condo._id.toString()}/logo.jpg?X-Amz-Signature=teste`)
    expect((await (await condominiums()).findOne({ _id: condo._id }))!.photo_url).toBe(canonical)
    expect((await verifyToken(res.cookies.get(AUTH_COOKIE)!.value)).condo_photo_url).toBe(canonical)

    expect((await setCondoPhoto(formRequest(fakeImage()))).status).toBe(400)

    const removed = await removeCondoPhoto()
    expect(removed.status).toBe(200)
    expect((await (await condominiums()).findOne({ _id: condo._id }))!.photo_url).toBeUndefined()
    expect((await verifyToken(removed.cookies.get(AUTH_COOKIE)!.value)).condo_photo_url).toBeUndefined()
  })

  it('foto de perfil: cada um altera só a própria', async () => {
    const condo = await createCondo()
    const me = await createUser(condo, 'sindico')
    const colleague = await createUser(condo, 'porteiro')
    await loginAs(me)

    const res = await setMyPhoto(formRequest(imageForm(JPEG)))
    const key = `condos/${condo._id.toString()}/users/${me._id.toString()}/avatar.jpg`
    expect((await res.json()).photo_url).toBe(`https://signed.test/${key}?X-Amz-Signature=teste`)
    expect((await (await users()).findOne({ _id: me._id }))!.photo_url).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${key}`)
    expect((await (await users()).findOne({ _id: colleague._id }))!.photo_url).toBeUndefined()

    expect((await setMyPhoto(formRequest(fakeImage()))).status).toBe(400)

    expect((await removeMyPhoto()).status).toBe(200)
    expect((await (await users()).findOne({ _id: me._id }))!.photo_url).toBeUndefined()
  })
})

describe('POST /api/ocr', () => {
  it('envia ao Gemini só os moradores ativos do condomínio da sessão', async () => {
    const condo = await createCondo()
    const ana = await createResident(condo, 'Ana')
    await createResident(await createCondo(), 'Morador de outro condomínio')
    await loginAs(await createUser(condo, 'porteiro'))
    analyze.mockResolvedValueOnce({ resident_id: ana._id.toString(), confidence: 'high', extracted_text: 'Ana 101' })

    const res = await ocr(formRequest(imageForm(JPEG)))
    expect(await res.json()).toEqual({
      match: { value: ana._id.toString(), label: 'Ana — Bloco A, Apto 101' },
      confidence: 'high',
      extracted_text: 'Ana 101',
    })

    const [, mimeType, sent] = analyze.mock.calls[0]
    expect(mimeType).toBe('image/jpeg')
    expect(sent.map((r) => r.name)).toEqual(['Ana'])
  })

  it('descarta morador que não é do condomínio, mesmo que o OCR devolva', async () => {
    const condo = await createCondo()
    await createResident(condo, 'Ana')
    const foreign = await createResident(await createCondo(), 'Outro')
    await loginAs(await createUser(condo, 'admin'))
    analyze.mockResolvedValueOnce({ resident_id: foreign._id.toString(), confidence: 'high', extracted_text: 'x' })

    expect(await (await ocr(formRequest(imageForm(JPEG)))).json()).toMatchObject({ match: null, confidence: 'low' })
  })

  it('sem moradores não chama o Gemini; falha do Gemini vira seleção manual', async () => {
    const condo = await createCondo()
    await loginAs(await createUser(condo, 'porteiro'))

    expect(await (await ocr(formRequest(imageForm(JPEG)))).json()).toMatchObject({ match: null })
    expect(analyze).not.toHaveBeenCalled()

    await createResident(condo, 'Ana')
    analyze.mockResolvedValueOnce(null)
    expect(await (await ocr(formRequest(imageForm(JPEG)))).json()).toMatchObject({ match: null, error: 'ocr_unavailable' })

    analyze.mockRejectedValueOnce(new Error('timeout'))
    vi.spyOn(console, 'error').mockImplementationOnce(() => {})
    expect(await (await ocr(formRequest(imageForm(JPEG)))).json()).toMatchObject({ match: null, error: 'ocr_unavailable' })
  })

  it('recusa arquivo que não é imagem', async () => {
    await loginAs(await createUser(await createCondo(), 'porteiro'))
    expect((await ocr(formRequest(fakeImage()))).status).toBe(400)
    expect(analyze).not.toHaveBeenCalled()
  })
})
