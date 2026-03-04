import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '../db/collections'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export interface JwtPayload {
  sub: string   // user _id como string
  name: string
  role: Role
  condo_id: string
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}
