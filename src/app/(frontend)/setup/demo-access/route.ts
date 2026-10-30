import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * The demo's two logins, advertised on the /demo guide page.
 *
 * The customer account is deliberately NOT the owner's instructor
 * account: the system uses that for her classes, and handing out a
 * password for it would grant access to the instructor view as well.
 * This account is an ordinary customer with credits — it sees exactly
 * what a guest sees.
 *
 *   curl -X POST http://localhost:3000/setup/demo-access \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Re-runnable: if the account exists, it only resets the password and
 * the credits.
 */
const EMAIL = 'kundin@demo.studio-lumen.ch'

/*
 * The studio-side account. It needs a password too, because the whole
 * point of the demo is that BOTH sides are visible: what the customer
 * sees, and what the studio sees. This account is an admin — it is the
 * owner's: she creates and deletes classes, releases pass orders, and
 * sees everybody's bookings.
 */
const INSTRUCTOR_EMAIL = 'nadine@team.studio-lumen.ch'

export async function POST(request: Request) {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  let password = ''
  try {
    password = String(((await request.json()) as { password?: string }).password ?? '')
  } catch {
    password = ''
  }
  if (password.length < 8) {
    return Response.json({ error: 'password fehlt (min. 8 Zeichen)' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })

    const match = await payload.find({
      collection: 'users', where: { email: { equals: EMAIL } }, limit: 1, depth: 0,
    })
    let user: any = (match.docs as any[])[0]

    if (user) {
      await payload.update({ collection: 'users', id: user.id, data: { password } })
    } else {
      user = await payload.create({
        collection: 'users',
        data: {
          email: EMAIL, password,
          firstName: 'Demo', lastName: 'Kundin',
          role: 'customer', language: 'de',
        },
      })
    }

    // At least 10 credits, so nothing stalls halfway through booking.
    const aboType: any = (await payload.find({
      collection: 'abo-types', where: { name: { equals: '10er Abo' } }, limit: 1, depth: 0,
    })).docs[0]
    const found = await payload.find({
      collection: 'abos',
      where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
      limit: 1, depth: 0,
    })
    const existing: any = (found.docs as any[])[0]
    const expires = new Date()
    expires.setMonth(expires.getMonth() + 7)

    if (existing) {
      await payload.update({
        collection: 'abos', id: existing.id,
        data: { creditsRemaining: 10, expiresAt: expires.toISOString() },
      })
    } else if (aboType) {
      await payload.create({
        collection: 'abos',
        data: {
          customer: user.id, aboType: aboType.id, creditsRemaining: 10,
          purchasedAt: new Date().toISOString(), expiresAt: expires.toISOString(),
          status: 'active', paymentMethod: 'on_site', paidAt: new Date().toISOString(),
        },
      })
    }

    /*
     * The studio-side account. It gets a password, and ADMIN rights.
     *
     * It used to be an instructor, on the reasoning that it should
     * reach as little as possible. That was a misreading: the account
     * belongs to the studio's owner, not to a junior instructor.
     * Without admin she cannot reach /verwaltung and cannot create or
     * delete a class — which is precisely the thing you would want to
     * try out, because it says the most: whether the owner can run the
     * system herself.
     */
    const instructor: any = (await payload.find({
      collection: 'users', where: { email: { equals: INSTRUCTOR_EMAIL } }, limit: 1, depth: 0,
    })).docs[0]
    let staffAccount: string | null = null
    if (instructor) {
      await payload.update({
        collection: 'users', id: instructor.id,
        data: { password, role: 'admin', language: 'de' },
      })
      // Read it back: the role field has its own write restriction,
      // and a change that silently fails would take away exactly what
      // this call exists for. This is how the caller sees whether it
      // worked.
      const probe: any = await payload.findByID({
        collection: 'users', id: instructor.id, depth: 0,
      })
      staffAccount = `${probe.email} (${probe.role}, ${probe.language})`
    }

    return Response.json({
      ok: true,
      staff: staffAccount,
      customer: EMAIL,
      studio: instructor ? INSTRUCTOR_EMAIL : null,
      credits: 10,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
