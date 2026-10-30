import { getPayload } from 'payload'
import config from '@payload-config'
import { seedSessions } from '@/seed-data'

/** Creates a test schedule. Only with ALLOW_SEED=true. */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'Seeding is disabled.' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    const result = await seedSessions(payload)
    return Response.json({ ok: true, result })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
