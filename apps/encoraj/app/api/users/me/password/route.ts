import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { users } from '@/lib/db/collections'

const schema = z.object({
  current_password: z.string().min(1, 'Informe a senha atual.'),
  new_password: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.'),
})

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const { current_password, new_password } = parsed.data

    const col = await users()
    const user = await col.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const valid = await compare(current_password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
    }

    const newHash = await hash(new_password, 10)
    await col.updateOne({ _id: user._id }, { $set: { password_hash: newHash } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[me/password]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
