import { describe, expect, it } from 'vitest'
import { can, PAGE_PERMISSIONS, PERMISSIONS, type Permission } from '@/lib/auth/permissions'
import {
  ASSIGNABLE_ROLES,
  canManageUserWith,
  hasRole,
  ORG_ADMIN_ROLE,
  sameRoles,
  SUPER_ADMIN_ROLE,
  tokenRoles,
  UNASSIGNABLE_ROLES,
} from '@/lib/auth/roles'

const KNOWN_ROLES = [...ASSIGNABLE_ROLES, ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE] as string[]
const keys = Object.keys(PERMISSIONS) as Permission[]
const withRoles = (...roles: string[]) => ({ roles })

/**
 * A matriz inteira, escrita à mão. Mudou o mapa de permissões? Este teste tem que mudar
 * junto, de propósito: é a revisão humana de "quem pode o quê".
 */
const EXPECTED: Record<Permission, string[]> = {
  'packages.register': ['administradora', 'admin', 'porteiro'],
  'packages.notify': ['administradora', 'admin', 'porteiro'],
  'packages.deliver': ['administradora', 'admin', 'porteiro'],
  'residents.write': ['administradora', 'admin', 'zelador'],
  'reports.view': ['administradora', 'admin', 'sindico'],
  'users.manage': ['administradora', 'admin'],
  'condo.manage': ['administradora', 'admin'],
  'data.erase': ['administradora', 'admin'],
  'org.condos': ['administradora'],
  'platform.admin': ['superadmin'],
}

describe('mapa de permissões', () => {
  it('é exatamente a matriz esperada', () => {
    expect(keys.sort()).toEqual(Object.keys(EXPECTED).sort())
    for (const key of keys) {
      expect([...PERMISSIONS[key].roles].sort(), key).toEqual([...EXPECTED[key]].sort())
    }
  })

  it('toda permissão tem grupo, descrição e só roles que existem', () => {
    for (const key of keys) {
      const { group, label, roles } = PERMISSIONS[key]
      expect(group.length, key).toBeGreaterThan(0)
      expect(label.length, key).toBeGreaterThan(0)
      expect(roles.length, key).toBeGreaterThan(0)
      for (const role of roles) expect(KNOWN_ROLES, `${key} → ${role}`).toContain(role)
    }
  })

  it('super admin pode tudo, e nenhuma role de condomínio (nem todas juntas) alcança a plataforma', () => {
    for (const key of keys) expect(can(withRoles(SUPER_ADMIN_ROLE), key), key).toBe(true)

    for (const role of ASSIGNABLE_ROLES) expect(can(withRoles(role), 'platform.admin'), role).toBe(false)
    expect(can(withRoles(...ASSIGNABLE_ROLES, ORG_ADMIN_ROLE), 'platform.admin')).toBe(false)
  })

  it('admin da administradora pode tudo que o admin de condomínio pode, mais os condomínios dela — e só', () => {
    for (const key of keys) {
      const expected = key === 'org.condos' || (key !== 'platform.admin' && can(withRoles('admin'), key))
      expect(can(withRoles(ORG_ADMIN_ROLE), key), key).toBe(expected)
    }
    // nenhuma role de condomínio, nem todas juntas, cria condomínio ou troca de condomínio
    expect(can(withRoles(...ASSIGNABLE_ROLES), 'org.condos')).toBe(false)
  })

  it('fora o super admin, cada role de condomínio pode exatamente o que a matriz diz', () => {
    for (const key of keys) {
      for (const role of ASSIGNABLE_ROLES) {
        expect(can(withRoles(role), key), `${role} → ${key}`).toBe(EXPECTED[key].includes(role))
      }
    }
  })

  it('toda página protegida aponta para uma permissão que existe', () => {
    for (const page of PAGE_PERMISSIONS) {
      expect(page.prefix.startsWith('/'), page.prefix).toBe(true)
      expect(keys, page.prefix).toContain(page.permission)
    }
    expect(PAGE_PERMISSIONS.find((p) => p.prefix === '/admin')?.permission).toBe('platform.admin')
    expect(PAGE_PERMISSIONS.find((p) => p.prefix === '/condos')?.permission).toBe('org.condos')
  })
})

describe('can', () => {
  it('as roles se somam', () => {
    const both = withRoles('zelador', 'porteiro')
    expect(can(both, 'residents.write')).toBe(true) // de zelador
    expect(can(both, 'packages.deliver')).toBe(true) // de porteiro
    expect(can(both, 'users.manage')).toBe(false) // de nenhuma
    expect(can(both, 'reports.view')).toBe(false)
  })

  it('sem roles, ou com role desconhecida, não pode nada', () => {
    for (const key of keys) {
      expect(can(withRoles(), key), key).toBe(false)
      expect(can(withRoles('morador'), key), key).toBe(false)
      expect(can(withRoles('root'), key), key).toBe(false)
    }
  })
})

describe('roles', () => {
  it('hasRole: basta uma', () => {
    expect(hasRole(withRoles('porteiro'), 'admin', 'porteiro')).toBe(true)
    expect(hasRole(withRoles('porteiro'), 'admin')).toBe(false)
    expect(hasRole(withRoles(), 'admin')).toBe(false)
    expect(hasRole(withRoles('admin'))).toBe(false)
  })

  it('tokenRoles: só aceita lista de textos não vazios', () => {
    expect(tokenRoles({ roles: ['admin', 'porteiro'] })).toEqual(['admin', 'porteiro'])
    expect(tokenRoles({ roles: ['admin', '', 3, null, { role: 'admin' }] })).toEqual(['admin'])
    expect(tokenRoles({ roles: 'admin' })).toEqual([])
    expect(tokenRoles({})).toEqual([])
    // formato antigo, de role única, não vale mais
    expect(tokenRoles({ role: 'admin' } as { roles?: unknown })).toEqual([])
  })

  it('sameRoles: mesmo conjunto, sem importar ordem nem repetição', () => {
    expect(sameRoles(['admin', 'porteiro'], ['porteiro', 'admin'])).toBe(true)
    expect(sameRoles(['admin', 'admin'], ['admin'])).toBe(true)
    expect(sameRoles(['admin'], ['admin', 'porteiro'])).toBe(false)
    expect(sameRoles(['admin', 'zelador'], ['admin', 'porteiro'])).toBe(false)
    expect(sameRoles([], [])).toBe(true)
  })

  it('ninguém mexe em quem está acima', () => {
    const [superAdmin, orgAdmin, admin] = [withRoles(SUPER_ADMIN_ROLE), withRoles(ORG_ADMIN_ROLE), withRoles('admin')]

    // alvo super admin: só outro super admin
    expect(canManageUserWith(superAdmin, ['admin', SUPER_ADMIN_ROLE])).toBe(true)
    expect(canManageUserWith(orgAdmin, [SUPER_ADMIN_ROLE])).toBe(false)
    expect(canManageUserWith(admin, [SUPER_ADMIN_ROLE])).toBe(false)
    // quem é os dois continua protegido como super admin
    expect(canManageUserWith(orgAdmin, [ORG_ADMIN_ROLE, SUPER_ADMIN_ROLE])).toBe(false)

    // alvo admin da administradora: outro dela, ou super admin
    expect(canManageUserWith(superAdmin, [ORG_ADMIN_ROLE])).toBe(true)
    expect(canManageUserWith(orgAdmin, [ORG_ADMIN_ROLE])).toBe(true)
    expect(canManageUserWith(admin, [ORG_ADMIN_ROLE, 'porteiro'])).toBe(false)

    // alvo comum: quem passou pela permissão da rota
    expect(canManageUserWith(admin, ['admin', 'porteiro'])).toBe(true)
    expect(canManageUserWith(admin, [])).toBe(true)
  })

  it('super admin e administradora nunca estão entre as roles que a tela de usuários atribui', () => {
    expect(ASSIGNABLE_ROLES as readonly string[]).not.toContain(SUPER_ADMIN_ROLE)
    expect(ASSIGNABLE_ROLES as readonly string[]).not.toContain(ORG_ADMIN_ROLE)
    expect(UNASSIGNABLE_ROLES).toContain(ORG_ADMIN_ROLE)
    expect(UNASSIGNABLE_ROLES).toContain(SUPER_ADMIN_ROLE)
    expect(UNASSIGNABLE_ROLES).toContain('morador')
  })
})
