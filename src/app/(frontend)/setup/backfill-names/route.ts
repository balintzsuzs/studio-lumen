import { getPayload } from 'payload'
import config from '@payload-config'

/** Backfills the `fullName` field on existing users. One-off. */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    const all = await payload.find({ collection: 'users', limit: 500, depth: 0 })
    let updated = 0
    for (const u of all.docs as any[]) {
      const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
      if (!full || u.fullName === full) continue
      await payload.update({ collection: 'users', id: u.id, data: { fullName: full } })
      updated++
    }
    return Response.json({ ok: true, updated })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
