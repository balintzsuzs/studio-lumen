import { getPayload } from 'payload'
import config from '@payload-config'
import { seed } from '@/seed-data'

/**
 * Egyszeri alapadat-felvétel a prototípushoz.
 * Csak akkor fut, ha a .env-ben ALLOW_SEED=true, hogy élesben ne legyen elérhető.
 *
 *   curl -X POST http://localhost:3000/setup/seed
 */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'Seed ist deaktiviert.' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    await seed(payload)
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
