import { getPayload } from 'payload'
import config from '@payload-config'

/** A demo pass for the admin user, so booking can be tried from the UI. */
export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  const payload = await getPayload({ config })
  const user: any = (await payload.find({
    collection: 'users', where: { role: { equals: 'admin' } }, sort: 'id', limit: 1,
  })).docs[0]
  const aboType: any = (await payload.find({
    collection: 'abo-types', where: { name: { equals: '10er Abo' } }, limit: 1,
  })).docs[0]
  const existing = await payload.find({
    collection: 'abos',
    where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
    limit: 1,
  })
  if (existing.totalDocs) return Response.json({ ok: true, note: 'Abo existiert bereits.' })

  const expires = new Date(); expires.setMonth(expires.getMonth() + 7)
  const abo = await payload.create({
    collection: 'abos',
    data: {
      customer: user.id, aboType: aboType.id, creditsRemaining: 10,
      purchasedAt: new Date().toISOString(), expiresAt: expires.toISOString(),
      status: 'active',
    },
  })
  return Response.json({ ok: true, id: abo.id, credits: 10 })
}
