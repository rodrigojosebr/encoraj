import jwt from 'jsonwebtoken'
import type { Role } from '../db/collections'

const SECRET = process.env.JWT_SECRET

if (!SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
}

export interface JwtPayload {
  sub: string   // user _id como string
  name: string
  role: Role
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET!, { expiresIn: '8h' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET!) as JwtPayload
}
