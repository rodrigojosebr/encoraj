import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/cookies'

/**
 * Destino do redirect quando o layout detecta sessão revogada (usuário desativado,
 * role alterado, senha trocada): Server Component não pode apagar cookie, esta rota pode.
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  clearSessionCookie(response)
  return response
}
