import { hasRole, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE } from './roles'

/**
 * FONTE ÚNICA de "quem pode o quê".
 *
 * Cada permissão diz quais roles a concedem. Como as roles se somam, o usuário pode fazer
 * algo se QUALQUER uma das suas roles estiver na lista. O super admin pode tudo (regra em
 * can(), abaixo).
 *
 * A permissão diz O QUÊ; o ONDE vem da sessão (session.condoId), que getSession() só
 * aceita se for o condomínio do usuário — ou, para o admin da administradora, um
 * condomínio dela; ou, para o super admin, qualquer um. Rotas, proxy, menu e a
 * tela de consulta (/admin/permissions) leem daqui — nenhum deles repete lista de roles.
 *
 * Isto fica no código de propósito: mudar permissão é mudança revisada e testada
 * (tests/helpers/routes.ts confere rota por rota), não um clique numa tela.
 *
 * Arquivo puro (sem banco), para servir também ao proxy.
 */
export const PERMISSIONS = {
  'packages.register': {
    group: 'Encomendas',
    label: 'Registrar chegada (foto, leitura da etiqueta)',
    roles: [ORG_ADMIN_ROLE, 'admin', 'porteiro'],
  },
  'packages.notify': {
    group: 'Encomendas',
    label: 'Avisar o morador',
    roles: [ORG_ADMIN_ROLE, 'admin', 'porteiro'],
  },
  'packages.deliver': {
    group: 'Encomendas',
    label: 'Confirmar retirada',
    roles: [ORG_ADMIN_ROLE, 'admin', 'porteiro'],
  },
  'residents.write': {
    group: 'Moradores',
    label: 'Cadastrar, editar, excluir e restaurar moradores',
    roles: [ORG_ADMIN_ROLE, 'admin', 'zelador', 'sindico'],
  },
  'residents.import': {
    group: 'Moradores',
    label: 'Importar moradores por planilha',
    roles: [ORG_ADMIN_ROLE, 'admin', 'sindico'],
  },
  'reports.view': {
    group: 'Relatórios',
    label: 'Ver relatórios e exportar planilhas',
    roles: [ORG_ADMIN_ROLE, 'admin', 'sindico'],
  },
  'users.manage': {
    group: 'Administração do condomínio',
    label: 'Gerir usuários e seus perfis',
    roles: [ORG_ADMIN_ROLE, 'admin'],
  },
  'condo.manage': {
    group: 'Administração do condomínio',
    label: 'Alterar nome e foto do condomínio',
    roles: [ORG_ADMIN_ROLE, 'admin'],
  },
  'data.erase': {
    group: 'Administração do condomínio',
    label: 'Remover dados definitivamente (LGPD) — sem botão na interface',
    roles: [ORG_ADMIN_ROLE, 'admin'],
  },
  'org.condos': {
    group: 'Administradora',
    label: 'Criar condomínios dentro da administradora e entrar em qualquer um deles',
    roles: [ORG_ADMIN_ROLE],
  },
  'platform.admin': {
    group: 'Plataforma',
    label: 'Criar administradoras e condomínios autogeridos, entrar em qualquer condomínio, ver erros do sistema e uso de IA',
    roles: [SUPER_ADMIN_ROLE],
  },
} as const satisfies Record<string, { group: string; label: string; roles: readonly string[] }>

export type Permission = keyof typeof PERMISSIONS

/**
 * O usuário pode fazer isto? Sim se alguma das roles dele concede a permissão — ou se
 * ele é super admin, que pode TUDO: opera a plataforma e, quando preciso, age dentro de
 * qualquer condomínio (depois de entrar nele em /admin/condos).
 * O admin da administradora entra nos condomínios dela em /condos.
 */
export function can(subject: { roles: readonly string[] }, permission: Permission): boolean {
  return hasRole(subject, SUPER_ADMIN_ROLE, ...PERMISSIONS[permission].roles)
}

/**
 * Páginas do dashboard e a permissão que cada uma exige. O proxy barra por aqui;
 * o menu mostra o item com a mesma regra. `/` e `/profile` são de qualquer usuário logado.
 * Um caminho pode casar com mais de um prefixo: aí o proxy exige todas as permissões
 * (`/residents/import` pede `residents.write` e `residents.import`).
 */
export const PAGE_PERMISSIONS: ReadonlyArray<{ prefix: string; permission: Permission }> = [
  { prefix: '/packages', permission: 'packages.register' },
  { prefix: '/residents', permission: 'residents.write' },
  { prefix: '/residents/import', permission: 'residents.import' },
  { prefix: '/users', permission: 'users.manage' },
  { prefix: '/reports', permission: 'reports.view' },
  { prefix: '/settings', permission: 'condo.manage' },
  { prefix: '/condos', permission: 'org.condos' },
  { prefix: '/admin', permission: 'platform.admin' },
]

/** O que todo usuário logado pode, sem depender de role — para a tela de consulta */
export const EVERYONE_CAN = [
  'Ver o painel inicial',
  'Ver e editar o próprio perfil, a própria foto e a própria senha',
]
