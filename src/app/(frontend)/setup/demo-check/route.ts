import { getPayload } from 'payload'
import config from '@payload-config'
import { napKulcs } from '@/lib/naptar'
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

type Pont = { rendben: boolean; cim: string; reszlet: string; teendo?: string }

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const pontok: Pont[] = []
    const szam = async (collection: any, where: any) =>
      (await payload.find({ collection, where, limit: 0, depth: 0 })).totalDocs

    // 1. Test residue
    const tesztFiok = await szam('users', { email: { like: '@test.local' } })
    const tesztOra = await szam('sessions', { note: { equals: 'TEST' } })
    const sorozat = await szam('session-series', {})
    const szemet = tesztFiok + tesztOra + sorozat
    pontok.push({
      rendben: szemet === 0,
      cim: 'No test residue',
      reszlet: `${tesztFiok} test accounts, ${tesztOra} TEST classes, ${sorozat} series`,
      teendo: szemet > 0
        ? 'Someone ran the test suite against this database. Clean it up before anyone sees it.'
        : undefined,
    })

    // 2. People
    const osszes = await szam('users', {})
    /*
     * The admin teaches too: Nadine owns the studio and also takes
     * classes. While we counted only the `instructor` role, changing
     * her role looked like a fault — when it was in fact the fix.
     */
    const oktato = await szam('users', { role: { in: ['instructor', 'admin'] } })
    pontok.push({
      rendben: osszes <= 20 && oktato >= 3,
      cim: 'The people list is in order',
      reszlet: `${osszes} people, ${oktato} of them teaching`,
      teendo: osszes > 20 ? 'Too many accounts — probably leftovers.' : undefined,
    })

    // 3. Are there any future classes at all
    const most = new Date()
    const jovo = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { greater_than: most.toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      sort: 'startsAt', limit: 40, depth: 0,
    })
    pontok.push({
      rendben: jovo.totalDocs >= 10,
      cim: 'Enough future classes',
      reszlet: `${jovo.totalDocs} classes in the period ahead`,
      teendo: jovo.totalDocs < 10 ? 'The schedule has run out: POST /setup/sessions' : undefined,
    })

    /*
     * 4. A full class with a waitlist — the first thing to go stale.
     *
     * It is not enough that one exists RIGHT NOW: the demo might be
     * tomorrow. So we count how many DAYS still have a full class with
     * a waitlist. Only today is not enough: leave it until the evening
     * and tomorrow shows an empty schedule.
     */
    const teltNapok = new Set<string>()
    let teltOra: any = null
    let varolistan = 0
    for (const s of jovo.docs as any[]) {
      const szabad = (await getAvailability(payload, s.id)).filter((r) => r.status === 'free')
      if (szabad.length > 0) continue
      const varnak = await szam('waitlist-entries', {
        and: [{ session: { equals: s.id } }, { status: { in: ['waiting', 'offered'] } }],
      })
      if (varnak === 0) continue
      teltNapok.add(napKulcs(s.startsAt))
      if (!teltOra) { teltOra = s; varolistan = varnak }
    }
    const oraig = teltOra
      ? Math.round((new Date(teltOra.startsAt).getTime() - most.getTime()) / 36e5)
      : null
    pontok.push({
      rendben: teltNapok.size >= 2,
      cim: 'A full class with a waitlist, across several days',
      reszlet: teltOra
        ? `on ${teltNapok.size} days; the next one in ${oraig} hours, ${varolistan} waiting`
        : 'no full class in the future',
      teendo: teltNapok.size < 2
        ? teltNapok.size === 1
          ? 'Only TODAY has a full class — it runs out by tomorrow. Refresh with: POST /setup/demo-data'
          : 'The strongest part of the demo is missing. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    // 5. An open pass order for the Verwaltung page
    const nyitott = await szam('abos', { status: { equals: 'pending' } })
    pontok.push({
      rendben: nyitott > 0,
      cim: 'There is an open pass order',
      reszlet: `${nyitott} open`,
      teendo: nyitott === 0
        ? 'The Verwaltung page would stand empty. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    // 6. A demo customer with credits
    const demo = (await payload.find({
      collection: 'users',
      where: { email: { equals: 'sandra@demo.studio-lumen.ch' } },
      limit: 1, depth: 0,
    })).docs[0] as any
    const kredit = demo
      ? (await payload.find({
          collection: 'abos',
          where: { and: [{ customer: { equals: demo.id } }, { status: { equals: 'active' } }] },
          limit: 1, depth: 0,
        })).docs[0] as any
      : null
    pontok.push({
      rendben: Boolean(kredit?.creditsRemaining > 0),
      cim: 'The demo customer can book',
      reszlet: demo
        ? `${demo.firstName} ${demo.lastName}, ${kredit?.creditsRemaining ?? 0} credits`
        : 'no demo customer',
      teendo: !kredit?.creditsRemaining
        ? 'You would have no booking to show. Refresh with: POST /setup/demo-data'
        : undefined,
    })

    const hibak = pontok.filter((p) => !p.rendben)
    return Response.json({
      bemutathato: hibak.length === 0,
      ellenorzesek: pontok.length,
      hibak: hibak.length,
      pontok,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
