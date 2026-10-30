import { getPayload } from 'payload'
import config from '@payload-config'
import { runAll } from '@/lib/test-suite'
import { tesztTiltas } from '@/lib/guard'

/**
 * A foglalási szabályok teljes teszt-készlete.
 *
 * Csak ALLOW_SEED=true mellett, és csak a HELYI SQLite adatbázison fut.
 * Az élesen (Postgres) nem: a készlet teszt-ügyfeleket és teszt-órákat
 * hoz létre, és ha maradék marad belőlük, az a bemutatón is látszik.
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
