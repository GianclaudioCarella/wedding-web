import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations')

/** Concatenated SQL of all Supabase migrations, in filename (timestamp) order. */
export function loadMigrationsSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
    .join('\n')
}

export interface Policy {
  name: string
  table: string
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  roles: string[]
  using: string | null
  withCheck: string | null
}

/** Extracts the balanced parenthesised expression following `keyword`. */
function clause(stmt: string, keyword: string): string | null {
  const idx = stmt.indexOf(keyword)
  if (idx === -1) return null
  const start = stmt.indexOf('(', idx + keyword.length)
  let depth = 0
  for (let i = start; i < stmt.length; i++) {
    if (stmt[i] === '(') depth++
    else if (stmt[i] === ')' && --depth === 0) {
      return stmt.slice(start + 1, i).replace(/\s+/g, ' ').trim().replace(/^\((.*)\)$/, '$1')
    }
  }
  return null
}

/** Parses the pg_dump-style CREATE POLICY statements in the migrations. */
export function parsePolicies(sql: string): Policy[] {
  const statements = sql.match(/CREATE POLICY [\s\S]*?;\n/g) ?? []
  return statements.map((stmt) => {
    const head = stmt.match(/CREATE POLICY "([^"]+)" ON public\.(\w+)(?: AS \w+)?(?: FOR (\w+))?(?: TO ([\w, ]+?))?(?= USING| WITH CHECK|;)/)
    if (!head) throw new Error(`Unparseable policy: ${stmt}`)
    return {
      name: head[1],
      table: head[2],
      command: (head[3] ?? 'ALL') as Policy['command'],
      roles: head[4] ? head[4].split(',').map((r) => r.trim()) : ['public'],
      using: clause(stmt, ' USING '),
      withCheck: clause(stmt, ' WITH CHECK '),
    }
  })
}

export function parseTables(sql: string): string[] {
  return [...sql.matchAll(/CREATE TABLE public\.(\w+) \(/g)].map((m) => m[1]).sort()
}

export function parseRlsEnabledTables(sql: string): string[] {
  return [...sql.matchAll(/ALTER TABLE public\.(\w+) ENABLE ROW LEVEL SECURITY;/g)].map((m) => m[1]).sort()
}
