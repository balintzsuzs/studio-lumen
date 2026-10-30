import { getPayload } from 'payload'
import config from '@payload-config'
import { seed } from '@/seed-data'

/**
 * One-off base-data seeding for the prototype.
 * Runs only when ALLOW_SEED=true in .env, so it is unreachable in
 * production.
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
