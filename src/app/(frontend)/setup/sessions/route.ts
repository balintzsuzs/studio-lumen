import { getPayload } from 'payload'
import config from '@payload-config'
import { seedSessions } from '@/seed-data'

/** Teszt-órarend felvétele. Csak ALLOW_SEED=true mellett. */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'Seed ist deaktiviert.' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    const result = await seedSessions(payload)
    return Response.json({ ok: true, result })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
