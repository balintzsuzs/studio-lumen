import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Creates the first admin user, if there is not one yet.
 * Runs only with ALLOW_SEED=true.
 *
 *   curl -X POST http://localhost:3000/setup/admin \
 *     -H 'content-type: application/json' \
 *     -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
 */
export async function POST(req: Request) {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'Setup ist deaktiviert.' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    const existing = await payload.find({ collection: 'users', limit: 1 })
    if (existing.totalDocs > 0) {
      return Response.json({ ok: true, note: 'Es gibt bereits Benutzer.' })
    }
    const body = await req.json()
    const user = await payload.create({
      collection: 'users',
      data: {
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'admin',
        language: 'de',
      },
    })
    return Response.json({ ok: true, id: user.id, email: user.email })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
