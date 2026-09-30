import path from 'path'
import { Pool } from 'pg'

// The MCP server runs as a standalone process (via `npx tsx`), not through
// Next.js, so .env.local isn't auto-loaded — load it explicitly.
try {
  process.loadEnvFile(path.join(process.cwd(), '.env.local'))
} catch {
  // already loaded, or file missing — fall back to whatever's in the environment
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
