import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export interface JwtPayload {
  sub: string   // user _id como string
  name: string
  /** Todas as roles do usuário — as permissões se somam */
  roles: string[]
  condo_id: string
  condo_name: string
  photo_url?: string       // user profile photo (S3 URL)
  condo_photo_url?: string // condo photo (S3 URL)
  iat?: number             // preenchido pelo jose na verificação
  exp?: number
}

export async function signToken(payload: JwtPayload): Promise<string> {
  // iat/exp de um token anterior não podem ser reaproveitados no re-sign
  const { iat: _iat, exp: _exp, ...claims } = payload
  void _iat
  void _exp
  return new SignJWT(claims as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}
