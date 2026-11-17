import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3/client'
import { s3KeyFromUrl, s3PublicUrl } from '@/lib/s3/upload'
import { signS3Url } from '@/lib/s3/sign'
import { deleteS3Prefix, deleteS3Urls } from '@/lib/s3/delete'

const BASE = 'https://test-bucket.s3.us-east-1.amazonaws.com/'
const CONDO = '507f1f77bcf86cd799439011'
const send = vi.mocked(s3.send) as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({})
})

describe('s3KeyFromUrl', () => {
  it('extrai a chave da URL canônica, com ou sem query string', () => {
    expect(s3KeyFromUrl(s3PublicUrl('condos/a/b.jpg'))).toBe('condos/a/b.jpg')
    expect(s3KeyFromUrl(`${BASE}condos/a/b.jpg?X-Amz-Signature=x`)).toBe('condos/a/b.jpg')
  })

  it.each([null, undefined, '', BASE, 'https://outro-bucket.s3.us-east-1.amazonaws.com/x.jpg', 'https://evil.com/x.jpg'])(
    'devolve null para %s',
    (url) => {
      expect(s3KeyFromUrl(url)).toBeNull()
    },
  )
})

describe('signS3Url', () => {
  it('assina URL do nosso bucket', async () => {
    expect(await signS3Url(`${BASE}condos/a/b.jpg`)).toBe('https://signed.test/condos/a/b.jpg?X-Amz-Signature=teste')
  })

  it('vazio vira null e URL de fora volta como veio', async () => {
    expect(await signS3Url(null)).toBeNull()
    expect(await signS3Url(undefined)).toBeNull()
    expect(await signS3Url('')).toBeNull()
    expect(await signS3Url('https://evil.com/x.jpg')).toBe('https://evil.com/x.jpg')
  })
})

describe('deleteS3Urls', () => {
  it('apaga só chaves do nosso bucket, sem repetir', async () => {
    const count = await deleteS3Urls([
      `${BASE}condos/a/1.jpg`,
      `${BASE}condos/a/1.jpg`,
      `${BASE}condos/a/2.png`,
      'https://evil.com/x.jpg',
      '',
      null,
      undefined,
    ])

    expect(count).toBe(2)
    expect(send).toHaveBeenCalledTimes(1)
    const command = send.mock.calls[0][0] as DeleteObjectsCommand
    expect(command).toBeInstanceOf(DeleteObjectsCommand)
    expect(command.input).toEqual({
      Bucket: 'test-bucket',
      Delete: { Objects: [{ Key: 'condos/a/1.jpg' }, { Key: 'condos/a/2.png' }], Quiet: true },
    })
  })

  it('sem nada para apagar não chama o S3', async () => {
    expect(await deleteS3Urls([null, 'https://evil.com/x.jpg'])).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('divide em lotes de 1000', async () => {
    const urls = Array.from({ length: 2500 }, (_, i) => `${BASE}condos/a/${i}.jpg`)
    expect(await deleteS3Urls(urls)).toBe(2500)
    expect(send.mock.calls.map(([c]) => (c as DeleteObjectsCommand).input.Delete!.Objects!.length)).toEqual([1000, 1000, 500])
  })
})

describe('deleteS3Prefix', () => {
  it('lista página por página e apaga tudo sob o prefixo', async () => {
    send
      .mockResolvedValueOnce({ Contents: [{ Key: 'k1' }, { Key: 'k2' }, {}], IsTruncated: true, NextContinuationToken: 't2' })
      .mockResolvedValueOnce({}) // delete da 1ª página
      .mockResolvedValueOnce({ Contents: [{ Key: 'k3' }], IsTruncated: false })
      .mockResolvedValueOnce({}) // delete da 2ª página

    expect(await deleteS3Prefix(`condos/${CONDO}/`)).toBe(3)

    const lists = send.mock.calls.map(([c]) => c).filter((c) => c instanceof ListObjectsV2Command) as ListObjectsV2Command[]
    expect(lists.map((c) => c.input)).toEqual([
      { Bucket: 'test-bucket', Prefix: `condos/${CONDO}/`, ContinuationToken: undefined },
      { Bucket: 'test-bucket', Prefix: `condos/${CONDO}/`, ContinuationToken: 't2' },
    ])
  })

  it('prefixo vazio não gera chamada de delete', async () => {
    expect(await deleteS3Prefix(`condos/${CONDO}/`)).toBe(0)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each(['', 'condos/', 'condos/abc/', `outros/${CONDO}/`, `condos/${CONDO}`])(
    'recusa prefixo amplo ou malformado: "%s"',
    async (prefix) => {
      await expect(deleteS3Prefix(prefix)).rejects.toThrow('Prefixo recusado')
      expect(send).not.toHaveBeenCalled()
    },
  )
})
