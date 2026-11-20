import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { APP_VERSION, CHANGE_TYPE_LABELS, RELEASES, currentDeploy } from '@/lib/releases/history'

const SEMVER = /^\d+\.\d+\.\d+$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const toNumbers = (version: string) => version.split('.').map(Number)
const isNewer = (a: string, b: string) => {
  const [x, y] = [toNumbers(a), toNumbers(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

describe('histórico de releases', () => {
  it('a versão do package.json é a da release mais nova', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))
    expect(APP_VERSION).toBe(RELEASES[0].version)
    expect(pkg.version).toBe(APP_VERSION)
  })

  it('da mais nova para a mais antiga, sem versão repetida e sem data voltando no tempo', () => {
    for (let i = 1; i < RELEASES.length; i++) {
      const [newer, older] = [RELEASES[i - 1], RELEASES[i]]
      expect(isNewer(newer.version, older.version), `${newer.version} depois de ${older.version}`).toBe(true)
      expect(newer.date >= older.date, `${newer.version} com data anterior a ${older.version}`).toBe(true)
    }
  })

  it('toda release tem versão, data válida, título, resumo e ao menos uma mudança com tipo conhecido', () => {
    for (const release of RELEASES) {
      expect(release.version).toMatch(SEMVER)
      expect(release.date).toMatch(DAY)
      expect(Number.isNaN(Date.parse(release.date))).toBe(false)
      expect(release.title.trim()).not.toBe('')
      expect(release.summary.trim()).not.toBe('')
      expect(release.changes.length).toBeGreaterThan(0)
      for (const change of release.changes) {
        expect(Object.keys(CHANGE_TYPE_LABELS)).toContain(change.type)
        expect(change.text.trim()).not.toBe('')
      }
      for (const commit of release.commits ?? []) expect(commit).toMatch(/^[0-9a-f]{7}$/)
    }
  })
})

describe('currentDeploy', () => {
  it('fora da Vercel: local, sem commit', () => {
    expect(currentDeploy({})).toEqual({ env: 'local', commit: null, message: null, branch: null })
  })

  it('na Vercel: ambiente, commit curto, mensagem e branch do deploy', () => {
    expect(
      currentDeploy({
        VERCEL_ENV: 'production',
        VERCEL_GIT_COMMIT_SHA: '01eb4f0a1b2c3d4e5f60718293a4b5c6d7e8f901',
        VERCEL_GIT_COMMIT_MESSAGE: 'feat: histórico de versões',
        VERCEL_GIT_COMMIT_REF: 'main',
      }),
    ).toEqual({ env: 'production', commit: '01eb4f0', message: 'feat: histórico de versões', branch: 'main' })
  })
})
