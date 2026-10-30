import { getPayload } from 'payload'
import config from '@payload-config'
import { runAll } from '@/lib/test-suite'
import { tesztTiltas } from '@/lib/guard'

/**
 * The full test suite for the booking rules.
 *
 * Runs only with ALLOW_SEED=true, and only against the LOCAL SQLite
 * database. Never against production (Postgres): the suite creates test
 * customers and test classes, and anything left behind would show up in
 * the demo.
 *
 *   curl -X POST http://localhost:3000/setup/test
 */
export async function POST() {
  const tiltas = tesztTiltas()
  if (tiltas.tiltva) return tiltas.valasz
  try {
    const payload = await getPayload({ config })
    const cases = await runAll(payload)
    const failed = cases.filter((c) => !c.pass)
    return Response.json({
      ok: failed.length === 0,
      total: cases.length,
      failed: failed.length,
      cases,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
