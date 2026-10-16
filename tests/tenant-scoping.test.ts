/**
 * Static guard for the data layer: every query on a tenant table in the
 * dashboard and data-layer code must filter by, or insert, wedding_id. RLS is
 * the second line of defence; this keeps a member of several weddings from
 * mixing their data once more than one tenant exists.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'
import { TENANT_TABLES } from './db/helpers'

const ROOT = join(__dirname, '..')
const DIRS = ['app', 'lib', 'components']

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('database.types.ts') ? [p] : []
  })
}

describe('tenant scoping of queries', () => {
  test('every .from(<tenant table>) query mentions wedding_id', () => {
    const offenders: string[] = []
    for (const file of DIRS.flatMap((d) => files(join(ROOT, d)))) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\.from\(\s*['"](\w+)['"]\s*\)/g)) {
        if (!(TENANT_TABLES as readonly string[]).includes(m[1])) continue
        const rest = src.slice(m.index! + m[0].length)
        const next = rest.search(/\.from\(/)
        const segment = rest.slice(0, Math.min(next === -1 ? rest.length : next, 600))
        if (!/wedding_id|withWedding/.test(segment)) {
          const line = src.slice(0, m.index).split('\n').length
          offenders.push(`${relative(ROOT, file)}:${line} (${m[1]})`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
