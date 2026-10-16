import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pre-existing debt surfaced when moving off `next lint`. These are
    // warnings for now so CI can gate on errors; tighten them back to
    // "error" as the affected files are touched.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
  {
    // Tenancy guard: the service_role client bypasses RLS, so it may only be
    // used through lib/data/*, whose functions always take a weddingId.
    files: ['**/*.{ts,tsx}'],
    ignores: ['lib/data/**', 'lib/supabase-admin.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/supabase-admin',
          message: 'Use the wedding-scoped functions in lib/data/* instead of the service_role client.',
        }],
        patterns: [{
          group: ['**/supabase-admin', '@/lib/data/client'],
          message: 'Use the wedding-scoped functions in lib/data/* instead of the service_role client.',
        }],
      }],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    'public/**',
    'lib/database.types.ts',
  ]),
])
