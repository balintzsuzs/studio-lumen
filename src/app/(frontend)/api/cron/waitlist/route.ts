import { getPayload } from 'payload'
import config from '@payload-config'
import { runWaitlistTick } from '@/lib/waitlist'

/**
 * Percenkénti várólista-kör élesben (Vercel Cron, lásd `vercel.json`).
 *
 * A `/setup/waitlist-tick` útvonaltól eltérően ez élesben is él, ezért
 * nem az `ALLOW_SEED`, hanem egy titok védi. A Vercel a sajátját az
 * `Authorization: Bearer $CRON_SECRET` fejlécben küldi.
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
