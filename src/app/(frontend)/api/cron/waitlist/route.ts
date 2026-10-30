import { getPayload } from 'payload'
import config from '@payload-config'
import { runWaitlistTick } from '@/lib/waitlist'

/**
 * The waitlist round in production (Vercel Cron, see `vercel.json`).
 *
 * Unlike `/setup/waitlist-tick`, this one is live in production, so it
 * is guarded by a secret rather than by `ALLOW_SEED`. Vercel sends its
 * own in an `Authorization: Bearer $CRON_SECRET` header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET fehlt' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'nicht berechtigt' }, { status: 401 })
  }

  try {
    const payload = await getPayload({ config })
    return Response.json({ ok: true, ...(await runWaitlistTick(payload)) })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
