import { ObjectId } from 'mongodb'
import * as usersRoute from '@/app/api/users/route'
import * as userRoute from '@/app/api/users/[id]/route'
import * as myPassword from '@/app/api/users/me/password/route'
import * as myPhoto from '@/app/api/users/me/photo/route'
import * as residentsRoute from '@/app/api/residents/route'
import * as residentRoute from '@/app/api/residents/[id]/route'
import * as packagesRoute from '@/app/api/packages/route'
import * as deliverRoute from '@/app/api/packages/[id]/deliver/route'
import * as notifyRoute from '@/app/api/packages/[id]/notify/route'
import * as uploadRoute from '@/app/api/upload/route'
import * as ocrRoute from '@/app/api/ocr/route'
import * as condoRoute from '@/app/api/condo/route'
import * as condoPhoto from '@/app/api/condo/photo/route'
import * as reportsExport from '@/app/api/reports/export/route'
import * as managementExport from '@/app/api/reports/management/export/route'
import * as clientErrors from '@/app/api/client-errors/route'
import * as adminError from '@/app/api/admin/errors/[id]/route'
import * as adminCondos from '@/app/api/admin/condos/route'
import * as adminOrgs from '@/app/api/admin/organizations/route'
import * as orgCondos from '@/app/api/org/condos/route'
import * as enterCondo from '@/app/api/condos/[id]/enter/route'
import * as eraseResident from '@/app/api/residents/[id]/erase/route'
import * as eraseUser from '@/app/api/users/[id]/erase/route'
import * as eraseCondo from '@/app/api/condo/erase/route'
import { ALL_ROLES, jsonRequest, routeCtx, type CondoRole } from './factory'

/**
 * Contrato de acesso de TODAS as rotas protegidas. Rota nova entra aqui —
 * se esquecer o getSession() ou o check de role, este arquivo quebra.
 */
const id = () => routeCtx(new ObjectId())
const req = (method: string) => jsonRequest(method, method === 'GET' ? undefined : {})

export const PROTECTED_ROUTES: Array<{ name: string; call: () => Promise<Response>; roles: CondoRole[] }> = [
  { name: 'POST /api/users', call: () => usersRoute.POST(req('POST')), roles: ['admin'] },
  { name: 'PUT /api/users/[id]', call: () => userRoute.PUT(req('PUT'), id()), roles: ['admin'] },
  { name: 'DELETE /api/users/[id]', call: () => userRoute.DELETE(req('DELETE'), id()), roles: ['admin'] },
  { name: 'PUT /api/users/me/password', call: () => myPassword.PUT(req('PUT')), roles: ALL_ROLES },
  { name: 'POST /api/users/me/photo', call: () => myPhoto.POST(req('POST')), roles: ALL_ROLES },
  { name: 'DELETE /api/users/me/photo', call: () => myPhoto.DELETE(), roles: ALL_ROLES },

  { name: 'POST /api/residents', call: () => residentsRoute.POST(req('POST')), roles: ['admin', 'zelador', 'sindico'] },
  { name: 'PUT /api/residents/[id]', call: () => residentRoute.PUT(req('PUT'), id()), roles: ['admin', 'zelador', 'sindico'] },
  { name: 'PATCH /api/residents/[id]', call: () => residentRoute.PATCH(req('PATCH'), id()), roles: ['admin', 'zelador', 'sindico'] },
  { name: 'DELETE /api/residents/[id]', call: () => residentRoute.DELETE(req('DELETE'), id()), roles: ['admin', 'zelador', 'sindico'] },

  { name: 'POST /api/packages', call: () => packagesRoute.POST(req('POST')), roles: ['admin', 'porteiro'] },
  { name: 'POST /api/packages/[id]/deliver', call: () => deliverRoute.POST(req('POST'), id()), roles: ['admin', 'porteiro'] },
  { name: 'POST /api/packages/[id]/notify', call: () => notifyRoute.POST(req('POST'), id()), roles: ['admin', 'porteiro'] },

  { name: 'POST /api/upload', call: () => uploadRoute.POST(req('POST')), roles: ['admin', 'porteiro'] },
  { name: 'POST /api/ocr', call: () => ocrRoute.POST(req('POST')), roles: ['admin', 'porteiro'] },

  { name: 'GET /api/condo', call: () => condoRoute.GET(), roles: ALL_ROLES },
  { name: 'PUT /api/condo', call: () => condoRoute.PUT(req('PUT')), roles: ['admin'] },
  { name: 'POST /api/condo/photo', call: () => condoPhoto.POST(req('POST')), roles: ['admin'] },
  { name: 'DELETE /api/condo/photo', call: () => condoPhoto.DELETE(), roles: ['admin'] },

  { name: 'GET /api/reports/export', call: () => reportsExport.GET(req('GET')), roles: ['admin', 'sindico'] },
  { name: 'GET /api/reports/management/export', call: () => managementExport.GET(req('GET')), roles: ['admin', 'sindico'] },

  { name: 'POST /api/client-errors', call: () => clientErrors.POST(req('POST')), roles: ALL_ROLES },

  // Plataforma: nenhum perfil de condomínio entra — só a role superadmin.
  // (O super admin passa em TODAS as rotas desta tabela: ver permissions.test e condos.test.)
  { name: 'PATCH /api/admin/errors/[id]', call: () => adminError.PATCH(req('PATCH'), id()), roles: [] },
  { name: 'POST /api/admin/condos', call: () => adminCondos.POST(req('POST')), roles: [] },
  { name: 'POST /api/admin/organizations', call: () => adminOrgs.POST(req('POST')), roles: [] },

  // Administradora: só a role `administradora` (e o super admin) — nenhum perfil de condomínio
  { name: 'POST /api/org/condos', call: () => orgCondos.POST(req('POST')), roles: [] },
  { name: 'POST /api/condos/[id]/enter', call: () => enterCondo.POST(req('POST'), id()), roles: [] },

  // Remoção definitiva (LGPD): só admin — nem síndico. Corpo vazio nunca apaga nada.
  { name: 'DELETE /api/residents/[id]/erase', call: () => eraseResident.DELETE(req('DELETE'), id()), roles: ['admin'] },
  { name: 'DELETE /api/users/[id]/erase', call: () => eraseUser.DELETE(req('DELETE'), id()), roles: ['admin'] },
  { name: 'DELETE /api/condo/erase', call: () => eraseCondo.DELETE(req('DELETE')), roles: ['admin'] },
]

