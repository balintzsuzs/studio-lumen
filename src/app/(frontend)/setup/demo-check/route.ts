import { getPayload } from 'payload'
import config from '@payload-config'
import { dayKey } from '@/lib/calendar'
import { getAvailability } from '@/lib/booking'

/**
 * "Is the demo ready?" — one call that measures every precondition.
 *
 * It reads and never writes, so it can run against production too.
 * `ALLOW_SEED` is not a requirement: this is exactly what you want to
 * use once the setup routes are already closed.
 *
 *   curl http://localhost:3000/setup/demo-check
 */

type Check = { ok: boolean; title: string; detail: string; todo?: string }

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const checks: Check[] = []
    const number = async (collection: any, where: any) =>
      (await payload.find({ collection, where, limit: 0, depth: 0 })).totalDocs

    // 1. Test residue
    const testAccount = await number('users', { email: { like: '@test.local' } })
    const testLesson = await number('sessions', { note: { equals: 'TEST' } })
    const series = await number('session-series', {})
    const junk = testAccount + testLesson + series
    checks.push({
      ok: junk === 0,
      title: 'No test residue',
      detail: `${testAccount} test accounts, ${testLesson} TEST classes, ${series} series`,
      todo: junk > 0
        ? 'Someone ran the test suite against this database. Clean it up before anyone sees it.'
        : undefined,
    })

    // 2. People
    const total = await number('users', {})
    /*
     * The admin teaches too: Nadine owns the studio and also takes
     * classes. While we counted only the `instructor` role, changing
     * her role looked like a fault — when it was in fact the fix.
     */
    const instructor = await number('users', { role: { in: ['instructor', 'admin'] } })
    checks.push({
      ok: total <= 20 && instructor >= 3,
      title: 'The people list is in order',
      detail: `${total} people, ${instructor} of them teaching`,
      todo: total > 20 ? 'Too many accounts — probably leftovers.' : undefined,
    })

    // 3. Are there any future classes at all
    const now = new Date()
    const future = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { greater_than: now.toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      sort: 'startsAt', limit: 40, depth: 0,
    })
    checks.push({
      ok: future.totalDocs >= 10,
      title: 'Enough future classes',
      detail: `${future.totalDocs} classes in the period ahead`,
      todo: future.totalDocs < 10 ? 'The schedule has run out: POST /setup/sessions' : undefined,
    })

    /*
     * 4. A full class with a waitlist — the first thing to go stale.
     *
     * It is not enough that one exists RIGHT NOW: the demo might be
     * tomorrow. So we count how many DAYS still have a full class with
     * a waitlist. Only today is not enough: leave it until the evening
     * and tomorrow shows an empty schedule.
     */
    const fullDays = new Set<string>()
    let fullLesson: any = null
    let onWaitlist = 0
    for (const s of future.docs as any[]) {
      const free = (await getAvailability(payload, s.id)).filter((r) => r.status === 'free')
      if (free.length > 0) continue
      const waiting = await number('waitlist-entries', {
        and: [{ session: { equals: s.id } }, { status: { in: ['waiting', 'offered'] } }],
      })
      if (waiting === 0) continue
      fullDays.add(dayKey(s.startsAt))
      if (!fullLesson) { fullLesson = s; onWaitlist = waiting }
    }
    const hoursUntil = fullLesson
      ? Math.round((new Date(fullLesson.startsAt).getTime() - now.getTime()) / 36e5)
      : null
    checks.push({
      ok: fullDays.size >= 2,
      title: 'A full class with a waitlist, across several days',
      detail: fullLesson
        ? `on ${fullDays.size} days; the next one in ${hoursUntil} hours, ${onWaitlist} waiting`
        : 'no full class in the future',
      todo: fullDays.size < 2
        ? fullDays.size === 1
          ? 'Only TODAY has a full class — it runs out by tomorrow. Refresh with: POST /setup/demo-data'
          : 'The strongest part of the demo is missing. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    // 5. An open pass order for the Verwaltung page
    const open = await number('abos', { status: { equals: 'pending' } })
    checks.push({
      ok: open > 0,
      title: 'There is an open pass order',
      detail: `${open} open`,
      todo: open === 0
        ? 'The Verwaltung page would stand empty. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    // 6. A demo customer with credits
    const demo = (await payload.find({
      collection: 'users',
      where: { email: { equals: 'sandra@demo.studio-lumen.ch' } },
      limit: 1, depth: 0,
    })).docs[0] as any
    const credit = demo
      ? (await payload.find({
          collection: 'abos',
          where: { and: [{ customer: { equals: demo.id } }, { status: { equals: 'active' } }] },
          limit: 1, depth: 0,
        })).docs[0] as any
      : null
    checks.push({
      ok: Boolean(credit?.creditsRemaining > 0),
      title: 'The demo customer can book',
      detail: demo
        ? `${demo.firstName} ${demo.lastName}, ${credit?.creditsRemaining ?? 0} credits`
        : 'no demo customer',
      todo: !credit?.creditsRemaining
        ? 'You would have no booking to show. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    const errors = checks.filter((p) => !p.ok)
    return Response.json({
      presentable: errors.length === 0,
      checkCount: checks.length,
      errors: errors.length,
      checks,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
