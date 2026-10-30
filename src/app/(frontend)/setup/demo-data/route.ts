import { getPayload } from 'payload'
import config from '@payload-config'
import { createBooking, getAvailability } from '@/lib/booking'
import { joinWaitlist } from '@/lib/waitlist'
import { orderAbo } from '@/lib/abo'
import { markAttendance } from '@/lib/attendance'

/**
 * Demo data: one demo customer with credits, and a few bookings so the
 * floor plan is not empty.
 *
 * Runs only with ALLOW_SEED=true, so it is unreachable in production —
 * it is called locally, pointed at whichever database is configured.
 *
 *   curl -X POST "http://localhost:3000/setup/demo-data" \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Re-runnable: anything that already exists is not created again.
 */

const DEMO_DOMAIN = '@demo.studio-lumen.ch'

/*
 * The main demo customer. It used to be "Nadine Demo", at
 * `nadine@demo.studio-lumen.ch` — except that address belongs to
 * Nadine Hofer's INSTRUCTOR account. So the old call did not create a
 * demo customer at all: it hung a customer pass on the instructor's
 * account, which is how Nadine ended up among the customers. She
 * belongs with the instructors.
 *
 * From here on the demo customer has its own, collision-free address,
 * and `ensure()` never touches an account that is not a customer.
 */
const DEMO_CUSTOMER = { email: 'sandra', firstName: 'Sandra', lastName: 'Demo' }

/*
 * The demo visitors, who appear as booked on the floor plan.
 *
 * There are six of them, because the demo needs a class to fill up
 * completely with people left over. Zug has four reformers, so six
 * guests fill it and two land on the waitlist. Without that the
 * waitlist cannot be shown at all, and it is one of the system's most
 * valuable features.
 */
const EXTRAS = [
  { firstName: 'Andrea', lastName: 'Demo' },
  { firstName: 'Beatrice', lastName: 'Demo' },
  { firstName: 'Carla', lastName: 'Demo' },
  { firstName: 'Doris', lastName: 'Demo' },
  { firstName: 'Eva', lastName: 'Demo' },
  { firstName: 'Franziska', lastName: 'Demo' },
]

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

    const aboType: any = (await payload.find({
      collection: 'abo-types', where: { name: { equals: '10er Abo' } }, limit: 1, depth: 0,
    })).docs[0]
    if (!aboType) return Response.json({ error: 'Abo-Typ fehlt, zuerst /setup/seed' }, { status: 400 })

    /** A customer plus an active pass, if they do not exist yet. */
    const ensure = async (
      email: string, firstName: string, lastName: string, credits: number,
    ) => {
      const found = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      let user: any = (found.docs as any[])[0]
      // Guard rail: if the address does not belong to a customer, we
      // leave it alone. That way a demo-data run cannot hang a pass on
      // an instructor's account.
      if (user && user.role !== 'customer') {
        throw new Error(
          `${email} is not a customer (${user.role}) — demo data never overwrites an instructor account`,
        )
      }
      if (!user) {
        user = await payload.create({
          collection: 'users',
          data: { email, password, firstName, lastName, role: 'customer' },
        })
      } else {
        // The password is set on an existing demo account too.
        // Otherwise, after the second run nobody can sign in as the
        // demo customer: the account exists, but its password is left
        // over from an earlier run and nobody knows it any more. And
        // showing what the customer sees is the whole point.
        await payload.update({ collection: 'users', id: user.id, data: { password } })
      }
      const abo = await payload.find({
        collection: 'abos',
        where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
        limit: 1, depth: 0,
      })
      const expires = new Date()
      expires.setMonth(expires.getMonth() + 7)
      if (!abo.totalDocs) {
        await payload.create({
          collection: 'abos',
          data: {
            customer: user.id, aboType: aboType.id, creditsRemaining: credits,
            purchasedAt: new Date().toISOString(), expiresAt: expires.toISOString(),
            status: 'active', paymentMethod: 'on_site', paidAt: new Date().toISOString(),
          },
        })
      } else {
        /*
         * Credits are topped up on every run, along with the expiry.
         *
         * Booking consumes credits, so after the third or fourth demo
         * preparation the guests are down to zero and further bookings
         * fail silently: empty classes, empty history, and no sign of
         * why. Preparing the demo is not "create it if missing" but
         * "put it into a known state".
         */
        await payload.update({
          collection: 'abos', id: (abo.docs as any[])[0].id,
          data: { creditsRemaining: credits, expiresAt: expires.toISOString() },
        })
      }
      return user
    }

    const demo = await ensure(
      `${DEMO_CUSTOMER.email}${DEMO_DOMAIN}`,
      DEMO_CUSTOMER.firstName, DEMO_CUSTOMER.lastName, 10,
    )
    const extras = []
    for (let i = 0; i < EXTRAS.length; i++) {
      const e = EXTRAS[i]
      extras.push(await ensure(`gast${i + 1}${DEMO_DOMAIN}`, e.firstName, e.lastName, 10))
    }

    // Book a few upcoming classes so there is something on the floor plan.
    const upcoming = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { greater_than: new Date().toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      // We want three days' worth of classes, not seven of them: there are four a day.
      sort: 'startsAt', limit: 16, depth: 0,
    })
    const lessons = upcoming.docs as any[]

    let booked = 0

    /*
     * Full classes with a waitlist — across the next THREE days, not
     * just the very next class.
     *
     * A class that fills up and a queue forming is one of the system's
     * most valuable parts, and the demo has to show it. It used to fill
     * only the next class up: if the preparation ran this afternoon,
     * that class was already in the past by tomorrow, and the demo
     * showed an empty schedule. This way there is something to look at
     * for three days, even if nobody re-runs anything.
     *
     * Zug has four machines against six demo guests — enough for two
     * people to land on the waitlist. Zürich has six, where nobody
     * would be left over, so we do not look for a full class there.
     */
    const fullLessons: number[] = []
    let onWaitlist = 0
    const usedDays = new Set<string>()

    for (const s of lessons) {
      if (fullLessons.length >= 3) break
      const day = s.startsAt.slice(0, 10)
      if (usedDays.has(day)) continue

      const spots = await getAvailability(payload, s.id)
      // Only where there are fewer spots than guests — otherwise it
      // never fills and there is no waitlist.
      if (spots.length === 0 || spots.length >= extras.length) continue

      let added = 0
      for (const u of extras.slice(0, spots.length)) {
        const r = await createBooking(payload, u.id, s.id)
        if (r.ok) { booked++; added++ }
      }
      if (added === 0) continue

      usedDays.add(day)
      fullLessons.push(s.id)

      // Whoever did not fit goes onto the waitlist.
      for (const u of extras.slice(spots.length)) {
        const r = await joinWaitlist(payload, u.id, s.id)
        if (r.ok) onWaitlist++
      }
    }
    const fullLesson: number | null = fullLessons[0] ?? null

    // The other classes fill partially, so the floor plan is not uniform.
    let partly = 0
    for (const s of lessons) {
      if (fullLessons.includes(s.id)) continue
      const howMany = [2, 3, 1, 3, 2][partly % 5]
      partly++
      for (const u of extras.slice(0, howMany)) {
        const r = await createBooking(payload, u.id, s.id)
        if (r.ok) booked++
      }
    }

    /*
     * A history in the past: attendance is recorded on finished
     * classes.
     *
     * Without it, every past class on a customer's profile stays
     * "gebucht", the statistics read zero, and the demo looks broken —
     * when in fact nobody ever took attendance.
     *
     * We do not manufacture new bookings: the finished classes already
     * have bookings from earlier runs, they were simply left open. A
     * new booking would clash with those (same person, same class) and
     * fail silently. This is also what the studio does after a class:
     * it records attendance.
     */
    let pastVisits = 0
    let noShows = 0
    const pastLessons = (await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { less_than: new Date().toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      sort: '-startsAt', limit: 6, depth: 0,
    })).docs as any[]

    for (const [i, lesson] of pastLessons.entries()) {
      const open = (await payload.find({
        collection: 'bookings',
        where: {
          and: [{ session: { equals: lesson.id } }, { status: { equals: 'booked' } }],
        },
        sort: 'bookedAt', limit: 20, depth: 0,
      })).docs as any[]

      for (const [j, b] of open.entries()) {
        // In the most recent class one person did not show up. A
        // no-show is not a theoretical case: the reliability figures
        // are where it becomes visible.
        const isNoShow = i === 0 && j === open.length - 1 && open.length > 1
        const r = await markAttendance(payload, b.id, isNoShow ? 'no_show' : 'attended')
        if (!r.ok) continue
        if (isNoShow) noShows++
        else pastVisits++
      }
    }

    // One open pass order, so the Verwaltung page has something to do.
    let openOrder: string | null = null
    const last = extras[extras.length - 1]
    if (last) {
      const r = await orderAbo(payload, last.id, aboType.id, 'transfer')
      if (r.ok) openOrder = last.email
    }

    return Response.json({
      ok: true,
      demoUser: demo.email,
      extras: extras.length,
      bookings: booked,
      // For the demo: this is the class that filled, and where the waitlist shows.
      fullLesson: fullLesson,
      fullLessons: fullLessons,
      warteliste: onWaitlist,
      pastVisits: pastVisits,
      noShows: noShows,
      openOrder: openOrder,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
