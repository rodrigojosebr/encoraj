import type { NextResponse } from 'next/server'
import { signToken } from './jwt'
import type { Session } from './session'

export const AUTH_COOKIE = 'encoraj_token'

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 8, // 8 horas
}

type SessionIdentity = Pick<Session, 'userId' | 'userName' | 'roles' | 'condoId' | 'condoName'>

/**
 * Emite um token novo e grava no cookie. Única forma de abrir ou trocar sessão: login,
 * troca de senha (o token antigo cai com o password_changed_at), troca de condomínio e
 * mudança do nome do condomínio. Foto não vai no token: o layout lê do banco.
 */
export async function setSessionCookie(response: NextResponse, identity: SessionIdentity): Promise<void> {
  const token = await signToken({
    sub: identity.userId,
    name: identity.userName,
    roles: identity.roles,
    condo_id: identity.condoId,
    condo_name: identity.condoName,
  })
  response.cookies.set(AUTH_COOKIE, token, COOKIE_OPTIONS)
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 })
}
