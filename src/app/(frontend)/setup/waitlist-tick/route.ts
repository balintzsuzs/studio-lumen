import { getPayload } from 'payload'
import config from '@payload-config'
import { runWaitlistTick } from '@/lib/waitlist'

/**
 * Expires waitlist offers that have run out and offers the spot to the
 * next person. In production a per-minute cron calls this (Vercel
 * Cron); in the prototype, by hand:
 *
 *   curl -X POST http://localhost:3000/setup/waitlist-tick
 */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    return Response.json({ ok: true, ...(await runWaitlistTick(payload)) })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
