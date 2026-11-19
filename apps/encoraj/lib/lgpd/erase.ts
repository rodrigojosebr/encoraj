import type { ObjectId } from 'mongodb'
import {
  aiUsage,
  auditLogs,
  condominiums,
  organizations,
  packages,
  passwordResetTokens,
  residents,
  users,
} from '@/lib/db/collections'
import { getStatus } from '@/lib/db/status-map'
import { deleteS3Prefix, deleteS3Urls } from '@/lib/s3/delete'

/**
 * Remoção DEFINITIVA de dados pessoais (pedido do titular, LGPD art. 18).
 * Diferente do soft-delete do dia a dia: aqui o dado some do banco e do S3 e não volta.
 *
 * Tudo é restrito ao condomínio informado. As rotas que chamam isto são só para admin
 * e não têm botão na interface.
 */

/** Frase exigida no corpo do request para confirmar uma remoção definitiva. */
export const ERASE_CONFIRMATION = 'APAGAR DEFINITIVAMENTE'

/** Nome que fica no histórico no lugar de quem foi removido. */
export const ERASED_ACTOR_NAME = 'Usuário removido'

export interface EraseResult {
  /** Encomendas que tiveram foto, QR code, PIN e observações apagados */
  packages: number
  /** Arquivos removidos do S3 */
  files: number
}

/** Morador com encomenda aguardando retirada não pode ser removido */
export interface ErasePending {
  pending: number
}

/**
 * Apaga o morador e tudo que o identifica: cadastro, foto da etiqueta e QR code das
 * encomendas dele, observações, PIN, link público e o conteúdo dos registros de auditoria.
 * As encomendas continuam existindo, anônimas, para os relatórios não mudarem de total.
 *
 * Só remove quem não tem NADA pendente de retirada: enquanto houver encomenda na
 * portaria, o PIN e o cadastro são necessários para entregá-la. É isso que garante que
 * nunca exista encomenda em aberto sem PIN.
 *
 * @returns null se o morador não existe; `{ pending }` se há encomendas em aberto.
 */
export async function eraseResident(
  condoId: ObjectId,
  residentId: ObjectId,
): Promise<EraseResult | ErasePending | null> {
  const resCol = await residents()
  const resident = await resCol.findOne({ _id: residentId, condo_id: condoId })
  if (!resident) return null

  const pkgCol = await packages()
  const scope = { condo_id: condoId, resident_id: residentId }

  const { _id: deliveredStatusId } = await getStatus('delivered')
  const pending = await pkgCol.countDocuments({ ...scope, status_id: { $ne: deliveredStatusId } })
  if (pending > 0) return { pending }

  const pkgs = await pkgCol.find(scope, { projection: { photo_url: 1, qrcode_url: 1 } }).toArray()

  const files = await deleteS3Urls(pkgs.flatMap((p) => [p.photo_url, p.qrcode_url]))

  await pkgCol.updateMany(scope, {
    $set: { photo_url: '', qrcode_url: '' },
    $unset: { notes: '', delivery_pin: '', public_token: '' },
  })

  // O log continua dizendo quem fez o quê e quando; o conteúdo (nome, WhatsApp, foto) sai
  await (await auditLogs()).updateMany(
    {
      condo_id: condoId,
      $or: [
        { entity: 'residents', entity_id: residentId },
        { entity: 'packages', entity_id: { $in: pkgs.map((p) => p._id) } },
      ],
    },
    { $unset: { before: '', after: '' } },
  )

  await resCol.deleteOne({ _id: residentId, condo_id: condoId })

  return { packages: pkgs.length, files }
}

/**
 * Apaga um usuário da equipe (porteiro, zelador, síndico, admin): cadastro, foto de
 * perfil e links de redefinição. No histórico, o nome dele vira "Usuário removido".
 */
export async function eraseUser(condoId: ObjectId, userId: ObjectId): Promise<{ files: number } | null> {
  const usersCol = await users()
  const user = await usersCol.findOne({ _id: userId, condo_id: condoId })
  if (!user) return null

  const files = await deleteS3Urls([user.photo_url])
  await (await passwordResetTokens()).deleteMany({ user_id: userId })

  const logs = await auditLogs()
  await logs.updateMany({ condo_id: condoId, actor_id: userId }, { $set: { actor_name: ERASED_ACTOR_NAME } })
  await logs.updateMany(
    { condo_id: condoId, entity: 'users', entity_id: userId },
    { $unset: { before: '', after: '' } },
  )

  await usersCol.deleteOne({ _id: userId, condo_id: condoId })

  return { files }
}

export interface EraseCondoResult {
  files: number
  packages: number
  residents: number
  users: number
}

/** Apaga o condomínio inteiro: arquivos, encomendas, moradores, usuários e auditoria. */
export async function eraseCondo(condoId: ObjectId): Promise<EraseCondoResult | null> {
  const condosCol = await condominiums()
  const condo = await condosCol.findOne({ _id: condoId }, { projection: { org_id: 1 } })
  if (!condo) return null

  const usersCol = await users()

  // Os admins da administradora não são do condomínio: só "moram" nele para ter onde cair
  // no login. Vão para outro condomínio dela (sem a foto, que ficava na pasta apagada).
  // Se este era o último, a administradora sai junto, com os admins dela.
  if (condo.org_id) {
    const sibling = await condosCol.findOne(
      { org_id: condo.org_id, _id: { $ne: condoId } },
      { sort: { name: 1 }, projection: { _id: 1 } },
    )
    if (sibling) {
      await usersCol.updateMany(
        { condo_id: condoId, org_id: condo.org_id },
        { $set: { condo_id: sibling._id }, $unset: { photo_url: '' } },
      )
    } else {
      await (await organizations()).deleteOne({ _id: condo.org_id })
    }
  }

  const files = await deleteS3Prefix(`condos/${condoId.toString()}/`)

  const userIds = (await usersCol.find({ condo_id: condoId }, { projection: { _id: 1 } }).toArray()).map((u) => u._id)
  await (await passwordResetTokens()).deleteMany({ user_id: { $in: userIds } })

  const scope = { condo_id: condoId }
  const [pkgs, res, usr] = await Promise.all([
    (await packages()).deleteMany(scope),
    (await residents()).deleteMany(scope),
    usersCol.deleteMany(scope),
    (await auditLogs()).deleteMany(scope),
    (await aiUsage()).deleteMany(scope),
  ])
  await condosCol.deleteOne({ _id: condoId })

  return { files, packages: pkgs.deletedCount, residents: res.deletedCount, users: usr.deletedCount }
}
