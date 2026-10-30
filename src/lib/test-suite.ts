import 'server-only'
import type { Payload, Where } from 'payload'
import {
  createBooking, cancelBooking, getAvailability, isClosed, findUsableAbo,
  DEFAULT_WAITLIST_WINDOWS,
} from './booking'
import {
  joinWaitlist, leaveWaitlist, promoteWaitlist, expireOffers, claimOffer, offerMinutesFor,
  sweepOpenSpots, runWaitlistTick,
} from './waitlist'
import {
  markAttendance, closeSession, getReliability, closeStaleSessions, AUTO_CLOSE_HOURS,
} from './attendance'
import { createSession, deleteSession } from './ora'
import { kundeProfil, kundeLista } from './kunde'
import { cancelSessionByStudio, cancelForTooFewParticipants } from './studio'
import { sessionLanguages, languageLabel } from './format'
import {
  orderAbo, confirmPayment, cancelOrder, getOpenOrder, listPurchasable,
  qualifiesForReduced, isYoungMember, expiryFrom,
} from './abo'
import { generateSessions, propagateToFutureSessions, zoneToUtc } from './series'
import {
  napKulcs, napKulcsVagyMa, napPlusz, hetNapja, hetKezdete, honapKezdete,
  honapHossza, naptarNapjai, naptarHatarok, naptarLepes, azonosHonap, naptarMod,
  naptarLekerdezes,
} from './naptar'

/**
 * The test suite for the booking rules.
 *
 * Every case creates its own data, and all test data is deleted at the
 * start of a run, so the suite is re-runnable and order-independent.
 * A test user has an @test.local email; a test class has note = 'TEST'.
 */

const TEST_DOMAIN = '@test.local'
const TEST_NOTE = 'TEST'

export type Case = { name: string; pass: boolean; detail?: string }

/** The rejection reason, if any. Type narrowing does not survive an argument boundary. */
const why = (r: unknown): string => {
  const o = r as { ok?: boolean; reason?: string }
  return o && o.ok === false && o.reason ? o.reason : ''
}

const q = async (fn: () => Promise<unknown>) => { try { await fn() } catch { /* takarítás */ } }

/**
 * Clean-up deletes only the suite's own data.
 *
 * It used to delete every booking, pass, waitlist entry and
 * notification, sweeping collection by collection. That suited the
 * tests, but a single run also took the demo data with it — the
 * schedule and the floor plan stood empty afterwards. So the scope is
 * now closed: owned by a test user (`@test.local`), or belonging to a
 * test class (`note = 'TEST'`), or marked by the test itself (`note`).
 */
export const reset = async (payload: Payload) => {
  const idk = (docs: unknown[]) => (docs as { id: number }[]).map((d) => d.id)

  const users = await payload.find({
    collection: 'users', where: { email: { like: TEST_DOMAIN } }, limit: 500, depth: 0,
  })
  const userIds = idk(users.docs)

  // The test series and the classes generated from them, plus standalone test classes.
  const series = await payload.find({
    collection: 'session-series', where: { name: { like: TEST_NOTE } }, limit: 500, depth: 0,
  })
  const sessionIds = new Set<number>()
  for (const sr of series.docs as any[]) {
    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, limit: 500, depth: 0,
    })
    for (const id of idk(kids.docs)) sessionIds.add(id)
  }
  const sajat = await payload.find({
    collection: 'sessions', where: { note: { equals: TEST_NOTE } }, limit: 500, depth: 0,
  })
  for (const id of idk(sajat.docs)) sessionIds.add(id)

  /** Test data if it belongs to a test user OR to a test class. */
  const takarit = async (
    c: 'notifications' | 'bookings' | 'waitlist-entries' | 'abos',
    birtokos: 'customer' | 'recipient',
    oraMezo: 'session' | null,
  ) => {
    const or: Where[] = []
    if (userIds.length) or.push({ [birtokos]: { in: userIds } })
    if (oraMezo && sessionIds.size) or.push({ [oraMezo]: { in: [...sessionIds] } })
    if (!or.length) return
    const all = await payload.find({ collection: c, where: { or }, limit: 500, depth: 0 })
    for (const id of idk(all.docs)) await q(() => payload.delete({ collection: c, id }))
  }

  // Order matters: whatever holds the reference goes first.
  await takarit('notifications', 'recipient', 'session')
  await takarit('bookings', 'customer', 'session')
  await takarit('waitlist-entries', 'customer', 'session')
  await takarit('abos', 'customer', null)

  // Closures: the tests delete these themselves at the end, so these
  // only survive an interrupted run — which is why they mark
  // themselves in the `note` field.
  const closures = await payload.find({
    collection: 'closure-periods', where: { note: { equals: TEST_NOTE } }, limit: 500, depth: 0,
  })
  for (const id of idk(closures.docs)) {
    await q(() => payload.delete({ collection: 'closure-periods', id }))
  }

  for (const id of sessionIds) await q(() => payload.delete({ collection: 'sessions', id }))
  for (const sr of series.docs as any[]) {
    await q(() => payload.delete({ collection: 'session-series', id: sr.id }))
  }
  for (const id of userIds) await q(() => payload.delete({ collection: 'users', id }))
}

type Ctx = {
  payload: Payload
  admin: any
  studioA: any
  studioB: any
  reformerType: any
  matType: any
}

const buildCtx = async (payload: Payload): Promise<Ctx> => {
  const admin = (await payload.find({
    collection: 'users', where: { role: { equals: 'admin' } }, sort: 'id', limit: 1,
  })).docs[0] as any
  if (!admin) throw new Error('Kein Admin vorhanden.')

  const studios = await payload.find({ collection: 'studios', sort: 'city', limit: 10, depth: 0 })
  const types = await payload.find({ collection: 'class-types', limit: 10, depth: 0 })
  return {
    payload,
    admin,
    studioA: studios.docs[0], // Zürich
    studioB: studios.docs[1], // Zug
    reformerType: (types.docs as any[]).find((t) => t.usesReformers),
    matType: (types.docs as any[]).find((t) => !t.usesReformers),
  }
}

let seq = 0
const mkCustomer = async (c: Ctx, name = 'Kundin') => {
  seq++
  return c.payload.create({
    collection: 'users',
    data: {
      email: `test${seq}${TEST_DOMAIN}`,
      password: crypto.randomUUID(),
      firstName: name, lastName: `Nr${seq}`, role: 'customer',
    },
  }) as Promise<any>
}

const mkAbo = async (
  c: Ctx, customer: any,
  { credits = 5, months = 6, status = 'active' as 'active' | 'expired' | 'cancelled' } = {},
) => {
  const aboType = (await c.payload.find({ collection: 'abo-types', limit: 1 })).docs[0] as any
  const expires = new Date()
  expires.setMonth(expires.getMonth() + months)
  return c.payload.create({
    collection: 'abos',
    data: {
      customer: customer.id, aboType: aboType.id, creditsRemaining: credits,
      purchasedAt: new Date().toISOString(), expiresAt: expires.toISOString(), status,
    },
  }) as Promise<any>
}

const mkSession = async (
  c: Ctx,
  { studio = c.studioA, type = c.reformerType, hours = 72, status = 'scheduled' as 'scheduled' | 'cancelled' } = {},
) => {
  const start = new Date(Date.now() + hours * 36e5)
  return c.payload.create({
    collection: 'sessions',
    data: {
      classType: type.id, studio: studio.id, instructor: c.admin.id,
      startsAt: start.toISOString(), durationMinutes: 60, status, note: TEST_NOTE,
    },
  }) as Promise<any>
}

/** Fills the class so the waitlist kicks in. Returns the bookings. */
const fillSession = async (c: Ctx, session: any) => {
  const free = (await getAvailability(c.payload, session.id)).filter((r) => r.status === 'free')
  const made: { userId: number; bookingId: number }[] = []
  for (const spot of free) {
    const u = await mkCustomer(c)
    await mkAbo(c, u)
    const r = await createBooking(c.payload, u.id, session.id, spot.reformerId)
    if (r.ok) made.push({ userId: u.id, bookingId: r.bookingId })
  }
  return made
}

const mkSeries = async (
  c: Ctx,
  { weekday = '1', time = '09:00', weeks = 4, studio = c.studioA } = {},
) => {
  const from = new Date()
  const to = new Date(Date.now() + weeks * 7 * 864e5)
  return c.payload.create({
    collection: 'session-series',
    data: {
      name: `${TEST_NOTE} ${weekday} ${time}`,
      classType: c.reformerType.id, studio: studio.id, instructor: c.admin.id,
      weekday, timeOfDay: time, durationMinutes: 60,
      startsOn: from.toISOString(), endsOn: to.toISOString(), status: 'active',
    },
  }) as Promise<any>
}

/** The notifications of a given type sent to one customer. */
const mails = async (c: Ctx, userId: number, type?: string) => {
  const and: any[] = [{ recipient: { equals: userId } }]
  if (type) and.push({ type: { equals: type } })
  const r = await c.payload.find({ collection: 'notifications', where: { and }, limit: 20, depth: 0 })
  return r.docs as any[]
}

const credits = async (c: Ctx, aboId: number) =>
  ((await c.payload.findByID({ collection: 'abos', id: aboId })) as any).creditsRemaining

// ---------------------------------------------------------------- cases

export const runAll = async (payload: Payload): Promise<Case[]> => {
  const out: Case[] = []
  const add = (name: string, pass: boolean, detail?: string) => out.push({ name, pass, detail })

  /** A failure in one block must not stop the rest; it shows up as a failed case. */
  const section = async (label: string, fn: () => Promise<void>) => {
    try { await fn() } catch (e) {
      add(`${label}: unerwarteter Fehler`, false, String(e).slice(0, 120))
    }
  }

  await reset(payload)
  const c = await buildCtx(payload)

  await section("successful booking, specific machine", async () => {
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    const s = await mkSession(c)
    const spots = await getAvailability(payload, s.id)
    const target = spots.find((x) => x.status === 'free')!
    const r = await createBooking(payload, u.id, s.id, target.reformerId)
    add('Buchung mit gewähltem Gerät', r.ok)
    add('Guthaben um 1 reduziert', (await credits(c, a.id)) === 4, `${await credits(c, a.id)}`)
    const after = await getAvailability(payload, s.id)
    add('Gewähltes Gerät gilt als belegt',
      after.find((x) => x.reformerId === target.reformerId)?.status === 'taken')
  })

  await section("booking without choosing a machine: automatic assignment", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Buchung ohne Gerätewahl wird automatisch zugeteilt', r.ok)
    if (r.ok) {
      const b: any = await payload.findByID({ collection: 'bookings', id: r.bookingId, depth: 0 })
      add('Automatische Zuteilung setzt ein Gerät', Boolean(b.reformer))
    } else add('Automatische Zuteilung setzt ein Gerät', false)
  })

  await section("the same customer twice", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    await createBooking(payload, u.id, s.id)
    const r = await createBooking(payload, u.id, s.id)
    add('Gleiche Kundin kann nicht zweimal buchen', !r.ok, why(r))
  })

  await section("another customer, machine already taken", async () => {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c); const a2 = await mkAbo(c, u2, { credits: 5 })
    const s = await mkSession(c)
    const spots = await getAvailability(payload, s.id)
    const t = spots.find((x) => x.status === 'free')!
    await createBooking(payload, u1.id, s.id, t.reformerId)
    const r = await createBooking(payload, u2.id, s.id, t.reformerId)
    add('Belegtes Gerät ist für andere gesperrt', !r.ok, why(r))
    add('Guthaben der abgewiesenen Kundin unverändert', (await credits(c, a2.id)) === 5)
  })

  await section("terem megtelik", async () => {
    const s = await mkSession(c, { studio: c.studioB }) // Zug, 4 machines
    const total = (await getAvailability(payload, s.id)).length
    for (let i = 0; i < total; i++) {
      const u = await mkCustomer(c); await mkAbo(c, u)
      await createBooking(payload, u.id, s.id)
    }
    const free = (await getAvailability(payload, s.id)).filter((x) => x.status === 'free').length
    add(`Alle ${total} Plätze belegbar`, free === 0, `${free} frei`)
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 3 })
    const r = await createBooking(payload, u.id, s.id)
    add('Ausgebuchte Lektion wird abgewiesen', !r.ok, why(r))
    add('Guthaben bei ausgebuchter Lektion unverändert', (await credits(c, a.id)) === 3)
  })

  await section("pass states", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 0 })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Abo ohne Guthaben wird abgewiesen', !r.ok, why(r))
  })
  {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5, months: -1 })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Abgelaufenes Abo wird abgewiesen', !r.ok, why(r))
  }
  {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5, status: 'cancelled' })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Storniertes Abo wird abgewiesen', !r.ok, why(r))
  }
  {
    const u = await mkCustomer(c)
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Ohne Abo wird abgewiesen', !r.ok, why(r))
  }

  await section("several passes: the one expiring soonest is used first", async () => {
    const u = await mkCustomer(c)
    const late = await mkAbo(c, u, { credits: 5, months: 10 })
    const soon = await mkAbo(c, u, { credits: 5, months: 2 })
    const picked = await findUsableAbo(payload, u.id)
    add('Zuerst läuft das früher ablaufende Abo', picked?.id === soon.id)
    const s = await mkSession(c)
    await createBooking(payload, u.id, s.id)
    add('Guthaben vom früher ablaufenden Abo abgezogen',
      (await credits(c, soon.id)) === 4 && (await credits(c, late.id)) === 5)
  })

  await section("class status", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { status: 'cancelled' })
    const r = await createBooking(payload, u.id, s.id)
    add('Abgesagte Lektion wird abgewiesen', !r.ok, why(r))
  })
  {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: -2 })
    const r = await createBooking(payload, u.id, s.id)
    add('Vergangene Lektion wird abgewiesen', !r.ok, why(r))
  }

  await section("wrong studio's machine, maintenance", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { studio: c.studioA })
    const foreign = (await payload.find({
      collection: 'reformers', where: { studio: { equals: c.studioB.id } }, limit: 1, depth: 0,
    })).docs[0] as any
    const r = await createBooking(payload, u.id, s.id, foreign.id)
    add('Gerät aus dem anderen Studio wird abgewiesen', !r.ok, why(r))
  })
  {
    const target = (await payload.find({
      collection: 'reformers', where: { studio: { equals: c.studioA.id } }, limit: 1, depth: 0,
    })).docs[0] as any
    await payload.update({ collection: 'reformers', id: target.id, data: { status: 'maintenance' } })
    const s = await mkSession(c, { studio: c.studioA })
    const spots = await getAvailability(payload, s.id)
    add('Gerät in Wartung erscheint als gesperrt',
      spots.find((x) => x.reformerId === target.id)?.status === 'blocked')
    const u = await mkCustomer(c); await mkAbo(c, u)
    const r = await createBooking(payload, u.id, s.id, target.id)
    add('Gerät in Wartung ist nicht buchbar', !r.ok, why(r))
    const freeNow = spots.filter((x) => x.status === 'free').length
    add('Wartung reduziert die Kapazität', freeNow === spots.length - 1, `${freeNow}/${spots.length}`)
    await payload.update({ collection: 'reformers', id: target.id, data: { status: 'active' } })
  }

  await section("scope of a closure", async () => {
    const s = await mkSession(c, { studio: c.studioA, type: c.reformerType })
    const d = new Date(s.startsAt)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()

    // only for the mat classes
    const cp1: any = await payload.create({
      collection: 'closure-periods',
      data: {
        name: 'Nur Matte', startsOn: day, endsOn: day,
        classTypes: [c.matType.id], note: TEST_NOTE,
      },
    })
    add('Schliessung für andere Kursart blockiert nicht', (await isClosed(payload, s)) === null)
    await payload.delete({ collection: 'closure-periods', id: cp1.id })

    // only for the other studio
    const cp2: any = await payload.create({
      collection: 'closure-periods',
      data: {
        name: 'Nur Zug', startsOn: day, endsOn: day,
        studios: [c.studioB.id], note: TEST_NOTE,
      },
    })
    add('Schliessung für anderes Studio blockiert nicht', (await isClosed(payload, s)) === null)
    await payload.delete({ collection: 'closure-periods', id: cp2.id })

    // for this class type
    const cp3: any = await payload.create({
      collection: 'closure-periods',
      data: {
        name: 'Reformer zu', startsOn: day, endsOn: day,
        classTypes: [c.reformerType.id], note: TEST_NOTE,
      },
    })
    add('Schliessung für diese Kursart blockiert', (await isClosed(payload, s)) !== null)
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 4 })
    const r = await createBooking(payload, u.id, s.id)
    add('Buchung während Schliessung abgewiesen', !r.ok, why(r))
    add('Guthaben bei Schliessung unverändert', (await credits(c, a.id)) === 4)
    await payload.delete({ collection: 'closure-periods', id: cp3.id })

    // applies to everything
    const cp4: any = await payload.create({
      collection: 'closure-periods',
      data: { name: 'Alles zu', startsOn: day, endsOn: day, note: TEST_NOTE },
    })
    add('Schliessung ohne Einschränkung blockiert alles', (await isClosed(payload, s)) !== null)
    await payload.delete({ collection: 'closure-periods', id: cp4.id })
    add('Nach Entfernen der Schliessung wieder buchbar', (await isClosed(payload, s)) === null)
  })

  await section("cancellation", async () => {
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    const s = await mkSession(c, { hours: 72 })
    const r = await createBooking(payload, u.id, s.id)
    const res = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('Stornierung mehr als 24h vorher erstattet', res.ok && res.refunded)
    add('Guthaben nach Erstattung zurück', (await credits(c, a.id)) === 5)
    const again = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('Doppelte Stornierung wird abgewiesen', !again.ok, why(again))
    add('Doppelte Stornierung erstattet nicht nochmal', (await credits(c, a.id)) === 5)
  })
  {
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    const s = await mkSession(c, { hours: 3 })
    const r = await createBooking(payload, u.id, s.id)
    const res = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('Stornierung innerhalb 24h erstattet nicht', res.ok && !res.refunded)
    add('Guthaben bleibt abgezogen', (await credits(c, a.id)) === 4)
  }
  {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c)
    const s = await mkSession(c)
    const r = await createBooking(payload, u1.id, s.id)
    const res = await cancelBooking(payload, u2.id, (r as any).bookingId)
    add('Fremde Buchung kann nicht storniert werden', !res.ok, why(res))
  }

  await section("after a cancellation the spot can be given out again", async () => {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c); await mkAbo(c, u2)
    const s = await mkSession(c)
    const spots = await getAvailability(payload, s.id)
    const t = spots.find((x) => x.status === 'free')!
    const r = await createBooking(payload, u1.id, s.id, t.reformerId)
    await cancelBooking(payload, u1.id, (r as any).bookingId)
    const r2 = await createBooking(payload, u2.id, s.id, t.reformerId)
    add('Nach Stornierung ist das Gerät wieder frei', r2.ok, why(r2))
  })

  await section("non-existent ids", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const r = await createBooking(payload, u.id, 999999)
    add('Nicht existierende Lektion wird abgewiesen', !r.ok)
    const res = await cancelBooking(payload, u.id, 999999)
    add('Nicht existierende Buchung wird abgewiesen', !res.ok)
  })

  // ------------------------------------------------ sliding waitlist

  await section("the steps of the offer window", async () => {
    const w = DEFAULT_WAITLIST_WINDOWS
    const at = (h: number) => offerMinutesFor(w, new Date(Date.now() + h * 36e5))
    add('Mehr als 48h vorher: 12 Stunden Frist', at(72) === 720, `${at(72)}`)
    add('Genau an der 48h-Stufe: 12 Stunden', at(48) === 720, `${at(48)}`)
    add('Zwischen 13h und 48h: 4 Stunden', at(20) === 240, `${at(20)}`)
    add('Unter 13h: nur Minuten', at(5) === 20, `${at(5)}`)
    add('Frist wird kürzer, je näher die Lektion', at(72) > at(20) && at(20) > at(5))
  })

  await section("waitlist only on a full class", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    const r = await joinWaitlist(payload, u.id, s.id)
    add('Warteliste abgelehnt, solange Plätze frei sind', !r.ok, why(r))
  })

  await section("joining, ordering, leaving", async () => {
    const s = await mkSession(c)
    await fillSession(c, s)
    const a = await mkCustomer(c); await mkAbo(c, a)
    const b = await mkCustomer(c); await mkAbo(c, b)
    const ra: any = await joinWaitlist(payload, a.id, s.id)
    const rb: any = await joinWaitlist(payload, b.id, s.id)
    add('Erste Person auf Warteliste: Position 1', ra.ok && ra.position === 1, why(ra))
    add('Zweite Person: Position 2', rb.ok && rb.position === 2, why(rb))
    const again = await joinWaitlist(payload, a.id, s.id)
    add('Doppelte Anmeldung wird abgewiesen', !again.ok, why(again))
    const left = await leaveWaitlist(payload, a.id, ra.entryId)
    add('Abmeldung von der Warteliste', left.ok, left.reason)
    const foreign = await leaveWaitlist(payload, b.id, ra.entryId)
    add('Fremder Eintrag kann nicht abgemeldet werden', !foreign.ok, foreign.reason)
  })

  await section("after a cancellation the first in line is offered the spot", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const w2 = await mkCustomer(c); await mkAbo(c, w2)
    const e1: any = await joinWaitlist(payload, w1.id, s.id)
    await joinWaitlist(payload, w2.id, s.id)

    const none = await promoteWaitlist(payload, s.id)
    add('Ohne freien Platz wird nichts angeboten', none.kind === 'nothing', (none as any).reason)

    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    add('Platz wird der ersten Person angeboten',
      p.kind === 'offered' && (p as any).offer.customerId === w1.id)
    add('Angebotsfrist bei 72h: 12 Stunden',
      p.kind === 'offered' && (p as any).offer.offerMinutes === 720)

    const twice = await promoteWaitlist(payload, s.id)
    add('Kein zweites Angebot, solange eines läuft', twice.kind === 'nothing', (twice as any).reason)

    const wrong = await claimOffer(payload, w2.id, (p as any).offer.entryId)
    add('Nur die angebotene Person kann den Platz holen', !wrong.ok, why(wrong))
    const got = await claimOffer(payload, w1.id, (p as any).offer.entryId)
    add('Angebot kann eingelöst werden', got.ok, why(got))
    const entry: any = await payload.findByID({
      collection: 'waitlist-entries', id: e1.entryId, depth: 0,
    })
    add('Eingelöster Eintrag gilt als gebucht', entry.status === 'converted', entry.status)
  })

  await section("an expired offer passes to the next person", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const w2 = await mkCustomer(c); await mkAbo(c, w2)
    const e1: any = await joinWaitlist(payload, w1.id, s.id)
    await joinWaitlist(payload, w2.id, s.id)
    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    add('Angebot an die erste Person', p.kind === 'offered')

    // mark the offer as expired, as if the window had run out
    await payload.update({
      collection: 'waitlist-entries', id: e1.entryId,
      data: { offerExpiresAt: new Date(Date.now() - 60000).toISOString() },
    })
    const tick = await expireOffers(payload)
    add('Abgelaufenes Angebot wird verfallen', tick.expired >= 1, `${tick.expired}`)
    add('Nächste Person erhält ein Angebot', tick.promoted >= 1, `${tick.promoted}`)
    const second = await payload.find({
      collection: 'waitlist-entries',
      where: { and: [{ session: { equals: s.id } }, { customer: { equals: w2.id } }] },
      limit: 1, depth: 0,
    })
    add('Angebot steht jetzt bei Person 2',
      (second.docs[0] as any)?.status === 'offered', (second.docs[0] as any)?.status)
    const late = await claimOffer(payload, w1.id, e1.entryId)
    add('Nach Fristablauf kein Zugriff mehr', !late.ok, why(late))
  })

  await section("inside the lock window everyone may book", async () => {
    const s = await mkSession(c, { hours: 3 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const belep = await joinWaitlist(payload, w1.id, s.id)
    const storno = await cancelBooking(payload, booked[0].userId, booked[0].bookingId)

    /*
     * The preconditions are asserted separately. On 2026-10-28 this
     * case failed once and passed on the retry, and `r.kind` alone did
     * not reveal which step had gone wrong. Now the failing assertion
     * will say so next time.
     */
    add('Precondition: the class filled up', booked.length > 0 && belep.ok,
      `${booked.length} foglalás, várólista: ${why(belep) || 'ok'}`)
    add('Precondition: the cancellation succeeded', storno.ok, storno.reason)
    const szabad = (await getAvailability(payload, s.id)).filter((x) => x.status === 'free')
    add('Precondition: a machine is free after the cancellation', szabad.length === 1, `${szabad.length}`)
    const varo = await payload.find({
      collection: 'waitlist-entries',
      where: { and: [{ session: { equals: s.id } }, { status: { equals: 'waiting' } }] },
      limit: 5, depth: 0,
    })
    add('Precondition: exactly one person is waiting', varo.totalDocs === 1, `${varo.totalDocs}`)

    // 30 minutes before the class there is no individual offer any more
    const soon = new Date(new Date(s.startsAt).getTime() - 30 * 60000)
    const r = await promoteWaitlist(payload, s.id, soon)
    add('Kurz vor Beginn wird der Platz für alle freigegeben', r.kind === 'released',
      `${r.kind}${r.kind === 'nothing' ? ': ' + (r as { reason?: string }).reason : ''}`)
  })

  await section("an offer never reaches past the lock window", async () => {
    const s = await mkSession(c, { hours: 14 })
    const booked = await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    await joinWaitlist(payload, w.id, s.id)
    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    const ok = p.kind === 'offered' &&
      (p as any).offer.expiresAt.getTime() <= new Date(s.startsAt).getTime() - 36e5
    add('Angebotsfrist endet spätestens im Sperrfenster', ok)
  })

  await section("sweeping: a freed-up spot is offered from the scheduler", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    const e: any = await joinWaitlist(payload, w.id, s.id)

    const idle = await sweepOpenSpots(payload)
    add('Bei voller Lektion bietet der Sweep nichts an', idle.promoted === 0, `${idle.promoted}`)

    // Free the machine directly, without offering it — as if an admin
    // had deleted the booking, or the offer attempt had failed.
    await payload.update({
      collection: 'bookings', id: booked[0].bookingId,
      data: { status: 'cancelled', cancelledAt: new Date().toISOString() },
    })
    const swept = await sweepOpenSpots(payload)
    add('Freier Platz wird vom Sweep angeboten', swept.promoted === 1, `${swept.promoted}`)
    const entry: any = await payload.findByID({ collection: 'waitlist-entries', id: e.entryId, depth: 0 })
    add('Der Eintrag steht auf «angeboten»', entry.status === 'offered', entry.status)
    add('Die Mail ist raus', (await mails(c, w.id, 'waitlist_offer')).length === 1)

    const again = await runWaitlistTick(payload)
    add('Der nächste Tick bietet nicht doppelt an', again.promoted === 0, `${again.promoted}`)
  })

  // ------------------------------------------------ attendance and no-shows

  await section("a no-show and a late cancellation are separate facts", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5 })
    const late = await mkSession(c, { hours: 3 })
    const rl = await createBooking(payload, u.id, late.id)
    await cancelBooking(payload, u.id, (rl as any).bookingId)
    const bl: any = await payload.findByID({ collection: 'bookings', id: (rl as any).bookingId, depth: 0 })
    add('Zu spät storniert wird als «zu spät» erfasst', bl.cancellationType === 'late', bl.cancellationType)

    const inTime = await mkSession(c, { hours: 72 })
    const ri = await createBooking(payload, u.id, inTime.id)
    await cancelBooking(payload, u.id, (ri as any).bookingId)
    const bi: any = await payload.findByID({ collection: 'bookings', id: (ri as any).bookingId, depth: 0 })
    add('Rechtzeitig storniert wird als «rechtzeitig» erfasst', bi.cancellationType === 'in_time', bi.cancellationType)
  })

  await section("closing a class: whoever booked counts as present", async () => {
    const s = await mkSession(c, { hours: 2 })
    const made = await fillSession(c, s)
    const early = await closeSession(payload, s.id)
    add('Noch nicht begonnene Lektion kann nicht geschlossen werden', !early.ok, early.reason)

    // The instructor marks ONLY the absentee — that is their entire job here.
    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(Date.now() - 2 * 36e5).toISOString() },
    })
    const hianyzo = await markAttendance(payload, made[0].bookingId, 'no_show')
    add('Trainerin markiert die Abwesende', hianyzo.ok, hianyzo.reason)

    const closed = await closeSession(payload, s.id)
    add('Alle übrigen gelten als anwesend',
      closed.ok && closed.marked === made.length - 1, `${closed.marked}/${made.length - 1}`)

    const rel = await getReliability(payload, made[1].userId)
    add('Wer nichts tun musste, zählt als besucht', rel.attended === 1, JSON.stringify(rel))
    const rel0 = await getReliability(payload, made[0].userId)
    add('Nur die markierte Person zählt als nicht erschienen',
      rel0.noShows === 1 && rel0.attended === 0, JSON.stringify(rel0))

    const again = await closeSession(payload, s.id)
    add('Erneutes Schliessen ändert nichts mehr', again.ok && again.marked === 0, `${again.marked}`)

    // The mark can be undone: anyone can misclick.
    const vissza = await markAttendance(payload, made[0].bookingId, 'attended')
    add('Markierung lässt sich zurücknehmen', vissza.ok, vissza.reason)
  })

  await section("an unclosed class closes itself", async () => {
    const s = await mkSession(c, { hours: 2 })
    const made = await fillSession(c, s)

    // A class that just finished: the instructor still has time to mark it.
    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(Date.now() - 1 * 36e5).toISOString() },
    })
    /*
     * We look at this one class, not at an aggregate count: the
     * database also holds demo classes, which the same call closes in
     * the same way, and a global count could break because of them at
     * any time. The test checks the rule, not the environment.
     */
    const allapot = async () =>
      ((await payload.findByID({
        collection: 'bookings', id: made[0].bookingId, depth: 0,
      })) as any).status

    await closeStaleSessions(payload)
    add('Frisch vergangene Lektion bleibt vorerst offen',
      (await allapot()) === 'booked', await allapot())

    // By the next day, though, it should settle itself.
    await payload.update({
      collection: 'sessions', id: s.id,
      data: {
        startsAt: new Date(Date.now() - (AUTO_CLOSE_HOURS + 1) * 36e5).toISOString(),
      },
    })
    await closeStaleSessions(payload)
    add('Alte Lektion schliesst sich von selbst und gilt als anwesend',
      (await allapot()) === 'attended', await allapot())
  })

  await section("creating a class", async () => {
    const holnap = new Date(Date.now() + 36 * 36e5)
    const nap = napKulcs(holnap)

    const r = await createSession(payload, {
      nap, ido: '07:15', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, perc: 60, megjegyzes: TEST_NOTE,
    })
    add('Lektion wird angelegt', r.ok, why(r))
    if (r.ok) {
      const uj: any = await payload.findByID({ collection: 'sessions', id: r.sessionId, depth: 0 })
      add('Lektion liegt am gewählten Tag', napKulcs(uj.startsAt) === nap, napKulcs(uj.startsAt))
      add('Lektion ist buchbar', uj.status === 'scheduled', uj.status)
    }

    const utkozik = await createSession(payload, {
      nap, ido: '07:15', classTypeId: c.reformerType.id, studioId: c.studioB.id,
      instructorId: c.admin.id, perc: 60, megjegyzes: TEST_NOTE,
    })
    add('Doppelbuchung derselben Trainerin wird abgewiesen', !utkozik.ok, why(utkozik))

    const mult = await createSession(payload, {
      nap: napKulcs(new Date(Date.now() - 48 * 36e5)), ido: '09:00',
      classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, perc: 60, megjegyzes: TEST_NOTE,
    })
    add('Lektion in der Vergangenheit wird abgewiesen', !mult.ok, why(mult))

    const rosszIdo = await createSession(payload, {
      nap, ido: '25:00', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, perc: 60, megjegyzes: TEST_NOTE,
    })
    add('Unsinnige Uhrzeit wird abgewiesen', !rosszIdo.ok, why(rosszIdo))

    const u = await mkCustomer(c)
    const nemOktato = await createSession(payload, {
      nap, ido: '20:30', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: u.id, perc: 60, megjegyzes: TEST_NOTE,
    })
    add('Kundin als Trainerin wird abgewiesen', !nemOktato.ok, why(nemOktato))
  })

  await section("deleting a class", async () => {
    const ures = await mkSession(c, { hours: 96 })
    const d1 = await deleteSession(payload, ures.id)
    add('Leere Lektion lässt sich löschen', d1.ok, why(d1))
    const maradt = await payload.find({
      collection: 'sessions', where: { id: { equals: ures.id } }, limit: 1, depth: 0,
    })
    add('Gelöschte Lektion ist weg', maradt.totalDocs === 0)

    const foglalt = await mkSession(c, { hours: 96 })
    const u = await mkCustomer(c); await mkAbo(c, u)
    await createBooking(payload, u.id, foglalt.id)
    const d2 = await deleteSession(payload, foglalt.id)
    add('Lektion mit Anmeldung lässt sich NICHT löschen', !d2.ok, why(d2))
    const megvan = await payload.find({
      collection: 'sessions', where: { id: { equals: foglalt.id } }, limit: 1, depth: 0,
    })
    add('Lektion mit Anmeldung bleibt bestehen', megvan.totalDocs === 1)
  })

  await section("stornierte Buchung nicht als anwesend", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 72 })
    const r = await createBooking(payload, u.id, s.id)
    await cancelBooking(payload, u.id, (r as any).bookingId)
    const m = await markAttendance(payload, (r as any).bookingId, 'attended')
    add('Stornierte Buchung kann nicht auf anwesend gesetzt werden', !m.ok, m.reason)
  })

  // ------------------------------------------------ recurring classes

  await section("generating a series", async () => {
    const sr = await mkSeries(c, { weekday: '1', time: '09:00', weeks: 4 })
    const g = await generateSessions(payload, sr.id)
    add('Serie erzeugt Lektionen', g.created >= 3, `${g.created}`)
    const again = await generateSessions(payload, sr.id)
    add('Erneutes Erzeugen duplizieren nicht', again.created === 0 && again.skipped === g.created,
      `${again.created}/${again.skipped}`)

    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })
    const days = new Set((kids.docs as any[]).map((k) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short' })
        .format(new Date(k.startsAt))))
    add('Alle Lektionen fallen auf den gewählten Wochentag', days.size === 1 && days.has('Mon'),
      [...days].join(','))
    const times = new Set((kids.docs as any[]).map((k) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour12: false, hour: '2-digit', minute: '2-digit' })
        .format(new Date(k.startsAt))))
    add('Ortszeit bleibt über die Sommerzeit hinweg gleich', times.size === 1 && times.has('09:00'),
      [...times].join(','))
  })

  await section("the daylight saving change", async () => {
    // In Switzerland in 2027, daylight saving begins on 28 March.
    const winter = zoneToUtc(2027, 3, 22, 9, 0) // Monday, CET (UTC+1)
    const summer = zoneToUtc(2027, 3, 29, 9, 0) // Monday, CEST (UTC+2)
    add('Vor der Zeitumstellung 09:00 = 08:00 UTC', winter.getUTCHours() === 8, `${winter.toISOString()}`)
    add('Nach der Zeitumstellung 09:00 = 07:00 UTC', summer.getUTCHours() === 7, `${summer.toISOString()}`)
  })

  await section("this and all future ones", async () => {
    const sr = await mkSeries(c, { weekday: '3', time: '18:00', weeks: 6 })
    await generateSessions(payload, sr.id)
    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })
    const list = kids.docs as any[]
    add('Mindestens vier Lektionen für den Test', list.length >= 4, `${list.length}`)
    const pivot = list[1]

    // a new instructor, so the propagation is visible
    const nina = await mkCustomer(c, 'Serien')
    await payload.update({ collection: 'users', id: nina.id, data: { role: 'instructor' } })

    await payload.update({
      collection: 'sessions', id: pivot.id,
      data: {
        instructor: nina.id,
        startsAt: new Date(new Date(pivot.startsAt).getTime() + 36e5).toISOString(),
        editScope: 'this_and_future',
      },
    })

    const after = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })
    const rows = after.docs as any[]
    const hourOf = (iso: string) => new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zurich', hour12: false, hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
    const instr = (v: any) => (typeof v === 'object' && v ? v.id : v)

    add('Frühere Lektion bleibt unverändert',
      hourOf(rows[0].startsAt) === '18:00' && instr(rows[0].instructor) === c.admin.id,
      hourOf(rows[0].startsAt))
    add('Geänderte Lektion hat die neue Zeit', hourOf(rows[1].startsAt) === '19:00', hourOf(rows[1].startsAt))
    add('Künftige Lektionen übernehmen die neue Zeit',
      rows.slice(1).every((r) => hourOf(r.startsAt) === '19:00'),
      rows.map((r) => hourOf(r.startsAt)).join(','))
    add('Künftige Lektionen übernehmen die neue Trainerin',
      rows.slice(1).every((r) => instr(r.instructor) === nina.id))
    add('Jede Lektion bleibt an ihrem eigenen Datum',
      new Set(rows.map((r) => new Date(r.startsAt).toISOString().slice(0, 10))).size === rows.length)

    const updatedSeries: any = await payload.findByID({
      collection: 'session-series', id: sr.id, depth: 0,
    })
    add('Serienregel übernimmt die neue Uhrzeit', updatedSeries.timeOfDay === '19:00', updatedSeries.timeOfDay)
    const pivotAfter: any = await payload.findByID({ collection: 'sessions', id: pivot.id, depth: 0 })
    add('Nach dem Übertragen steht der Bereich wieder auf «nur diese»',
      pivotAfter.editScope === 'only_this', pivotAfter.editScope)
  })

  await section("this class only: it detaches from the series", async () => {
    const sr = await mkSeries(c, { weekday: '5', time: '07:30', weeks: 6 })
    await generateSessions(payload, sr.id)
    const list = (await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })).docs as any[]

    // postpone the second one individually
    await payload.update({
      collection: 'sessions', id: list[1].id,
      data: {
        startsAt: new Date(new Date(list[1].startsAt).getTime() + 2 * 36e5).toISOString(),
        editScope: 'only_this',
      },
    })
    const detached: any = await payload.findByID({ collection: 'sessions', id: list[1].id, depth: 0 })
    add('Einzeln geänderte Lektion wird von der Serie gelöst', detached.detached === true)

    // now change it at series level, from the first one
    await payload.update({
      collection: 'sessions', id: list[0].id,
      data: {
        startsAt: new Date(new Date(list[0].startsAt).getTime() + 36e5).toISOString(),
        editScope: 'this_and_future',
      },
    })
    const stillDetached: any = await payload.findByID({ collection: 'sessions', id: list[1].id, depth: 0 })
    add('Serienänderung überschreibt die gelöste Lektion nicht',
      new Date(stillDetached.startsAt).getTime() === new Date(detached.startsAt).getTime())
    const third: any = await payload.findByID({ collection: 'sessions', id: list[2].id, depth: 0 })
    add('Nicht gelöste Lektionen folgen der Serienänderung',
      new Date(third.startsAt).getTime() === new Date(list[2].startsAt).getTime() + 36e5)
  })

  await section("a series change carries the bookings with it", async () => {
    const sr = await mkSeries(c, { weekday: '2', time: '10:00', weeks: 6 })
    await generateSessions(payload, sr.id)
    const list = (await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })).docs as any[]
    const target = list[2]

    const u = await mkCustomer(c); await mkAbo(c, u)
    const r = await createBooking(payload, u.id, target.id)
    add('Buchung auf einer Serien-Lektion', r.ok, why(r))

    await payload.update({
      collection: 'sessions', id: list[1].id,
      data: {
        startsAt: new Date(new Date(list[1].startsAt).getTime() + 90 * 60000).toISOString(),
        editScope: 'this_and_future',
      },
    })
    const b: any = await payload.findByID({ collection: 'bookings', id: (r as any).bookingId, depth: 1 })
    add('Buchung bleibt aktiv', b.status === 'booked', b.status)
    add('Buchung folgt der neuen Zeit automatisch',
      new Date(b.session.startsAt).getTime() === new Date(target.startsAt).getTime() + 90 * 60000)
  })

  // ------------------------------------------------ notifications

  await section("the waitlist offer email", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    await joinWaitlist(payload, w.id, s.id)
    add('Vor dem Angebot keine Mail', (await mails(c, w.id)).length === 0)

    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    const m = await mails(c, w.id, 'waitlist_offer')
    add('Angebot löst eine Mail aus', m.length === 1, `${m.length}`)
    add('Mail nennt die Frist',
      m[0] && p.kind === 'offered' && m[0].body.includes(String(new Date((p as any).offer.expiresAt).getFullYear())))
    add('Mail enthält den Buchungslink', m[0]?.body.includes(`/buchen/${s.id}`))
    add('Mail ist der Lektion zugeordnet', m[0] && (typeof m[0].session === 'object' ? m[0].session.id : m[0].session) === s.id)
  })

  await section("the release email inside the lock window", async () => {
    const s = await mkSession(c, { hours: 3 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const w2 = await mkCustomer(c); await mkAbo(c, w2)
    await joinWaitlist(payload, w1.id, s.id)
    await joinWaitlist(payload, w2.id, s.id)
    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const soon = new Date(new Date(s.startsAt).getTime() - 30 * 60000)
    await promoteWaitlist(payload, s.id, soon)
    add('Alle Wartenden werden informiert',
      (await mails(c, w1.id, 'waitlist_released')).length === 1 &&
      (await mails(c, w2.id, 'waitlist_released')).length === 1)
  })

  await section("notification of a time change", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 96 })
    await createBooking(payload, u.id, s.id)
    add('Buchung allein löst keine Änderungsmail aus',
      (await mails(c, u.id, 'session_changed')).length === 0)

    await payload.update({
      collection: 'sessions', id: s.id,
      data: { durationMinutes: 55 },
    })
    add('Dauer-Änderung ist keine Kundeninformation',
      (await mails(c, u.id, 'session_changed')).length === 0)

    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(new Date(s.startsAt).getTime() + 2 * 36e5).toISOString() },
    })
    const m = await mails(c, u.id, 'session_changed')
    add('Zeitänderung wird gemeldet', m.length === 1, `${m.length}`)
    add('Mail zeigt alte und neue Zeit', m[0]?.body.includes('→'))
    add('Mail erklärt die Stornomöglichkeit', m[0]?.body.includes('24 Stunden'))
  })

  await section("notification of an instructor change", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 96 })
    await createBooking(payload, u.id, s.id)
    const nina = await mkCustomer(c, 'Vertretung')
    await payload.update({ collection: 'users', id: nina.id, data: { role: 'instructor' } })
    await payload.update({ collection: 'sessions', id: s.id, data: { instructor: nina.id } })
    const m = await mails(c, u.id, 'session_changed')
    add('Trainerinnenwechsel wird gemeldet', m.length === 1, `${m.length}`)
    add('Mail nennt die neue Trainerin', m[0]?.body.includes('Vertretung'))
  })

  await section("a cancelled booking gets no notification", async () => {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c); await mkAbo(c, u2)
    const s = await mkSession(c, { hours: 96 })
    const r1 = await createBooking(payload, u1.id, s.id)
    await createBooking(payload, u2.id, s.id)
    await cancelBooking(payload, u1.id, (r1 as any).bookingId)
    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(new Date(s.startsAt).getTime() + 36e5).toISOString() },
    })
    add('Wer storniert hat, erhält nichts', (await mails(c, u1.id, 'session_changed')).length === 0)
    add('Wer gebucht hat, erhält die Information', (await mails(c, u2.id, 'session_changed')).length === 1)
  })

  await section("a series change notifies the people booked into the affected classes", async () => {
    const sr = await mkSeries(c, { weekday: '4', time: '08:00', weeks: 6 })
    await generateSessions(payload, sr.id)
    const list = (await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })).docs as any[]

    const early = await mkCustomer(c); await mkAbo(c, early)
    const later = await mkCustomer(c); await mkAbo(c, later)
    await createBooking(payload, early.id, list[0].id)
    await createBooking(payload, later.id, list[3].id)

    await payload.update({
      collection: 'sessions', id: list[1].id,
      data: {
        startsAt: new Date(new Date(list[1].startsAt).getTime() + 36e5).toISOString(),
        editScope: 'this_and_future',
      },
    })
    add('Frühere Lektion: keine Mail', (await mails(c, early.id, 'session_changed')).length === 0)
    add('Spätere Lektion: Mail verschickt', (await mails(c, later.id, 'session_changed')).length === 1)
  })

  // ------------------------------------------------ cancellation by the studio

  await section("the studio cancels the class", async () => {
    const s = await mkSession(c, { hours: 3 })
    const made = await fillSession(c, s)
    const before = await Promise.all(made.map(async (m) => {
      const b: any = await payload.findByID({ collection: 'bookings', id: m.bookingId, depth: 0 })
      return { aboId: typeof b.abo === 'object' ? b.abo.id : b.abo, credits: await credits(c, typeof b.abo === 'object' ? b.abo.id : b.abo) }
    }))

    const r = await cancelSessionByStudio(payload, s.id, 'Krankheit der Trainerin')
    add('Absage durch das Studio gelingt', r.ok, r.reason)
    add('Alle Buchungen storniert', r.cancelled === made.length, `${r.cancelled}/${made.length}`)
    add('Guthaben allen zurückgebucht', r.refunded === made.length, `${r.refunded}`)
    add('Alle informiert', r.notified === made.length, `${r.notified}`)

    const after = await Promise.all(before.map((b) => credits(c, b.aboId)))
    add('Guthaben trotz 24h-Frist erstattet',
      after.every((v, i) => v === before[i].credits + 1), after.join(','))

    const b0: any = await payload.findByID({ collection: 'bookings', id: made[0].bookingId, depth: 0 })
    add('Stornoart ist «durch das Studio»', b0.cancellationType === 'by_studio', b0.cancellationType)
    const sess: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 0 })
    add('Lektion gilt als abgesagt', sess.status === 'cancelled', sess.status)
    add('Grund steht in der Lektion',
      sess.cancellationReason === 'Krankheit der Trainerin', sess.cancellationReason)
    add('Der Hinweis der Inhaberin bleibt unberührt', sess.note === 'TEST', sess.note)

    const m = await mails(c, made[0].userId, 'session_cancelled')
    add('Absage-Mail nennt den Grund', m[0]?.body.includes('Krankheit der Trainerin'))
    add('Absage-Mail nennt die Rückbuchung', m[0]?.body.includes('zurückgebucht'))
    add('Keine Änderungsmail zusätzlich',
      (await mails(c, made[0].userId, 'session_changed')).length === 0)

    const again = await cancelSessionByStudio(payload, s.id, 'Krankheit der Trainerin')
    add('Erneute Absage bucht nichts doppelt zurück', again.ok && again.refunded === 0, `${again.refunded}`)
  })

  await section("cancelling withdraws the waitlist too", async () => {
    const s = await mkSession(c, { hours: 48 })
    await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    const e: any = await joinWaitlist(payload, w.id, s.id)
    await cancelSessionByStudio(payload, s.id, 'Organisatorische Gründe')
    const entry: any = await payload.findByID({ collection: 'waitlist-entries', id: e.entryId, depth: 0 })
    add('Wartelisteneintrag wird zurückgezogen', entry.status === 'withdrawn', entry.status)
  })

  await section("too few participants (minimum 2)", async () => {
    const full = await mkSession(c, { hours: 48 })
    await fillSession(c, full)
    const no = await cancelForTooFewParticipants(payload, full.id, 2)
    add('Bei genug Anmeldungen wird nicht abgesagt', !no.ok, no.reason)

    const thin = await mkSession(c, { hours: 48 })
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    await createBooking(payload, u.id, thin.id)
    add('Guthaben nach Buchung', (await credits(c, a.id)) === 4)
    const r = await cancelForTooFewParticipants(payload, thin.id, 2)
    add('Mit einer Anmeldung wird abgesagt', r.ok, r.reason)
    add('Guthaben kommt zurück', (await credits(c, a.id)) === 5, `${await credits(c, a.id)}`)
    const m = await mails(c, u.id, 'session_cancelled')
    add('Mail nennt die zu wenigen Anmeldungen', m[0]?.body.includes('Zu wenige Anmeldungen'))

    const empty = await mkSession(c, { hours: 48 })
    const r2 = await cancelForTooFewParticipants(payload, empty.id, 2)
    add('Leere Lektion kann abgesagt werden, ohne jemanden zu informieren',
      r2.ok && r2.cancelled === 0 && r2.notified === 0)
  })

  // ------------------------------------------------ ordering a pass without payment

  await section("rate eligibility", async () => {
    const now = new Date('2026-06-15T00:00:00Z')
    add('24 Jahre ist noch Young Member', isYoungMember(2002, now))
    add('16 Jahre ist Young Member', isYoungMember(2010, now))
    add('25 Jahre ist es nicht mehr', !isYoungMember(2001, now))
    add('15 Jahre noch nicht', !isYoungMember(2011, now))
    add('Ohne Jahrgang kein Young Member', !isYoungMember(undefined, now))
    add('Matten-Teilnehmende sind berechtigt', qualifiesForReduced({ isMatCustomer: true }))
    add('Ohne beides nicht berechtigt', !qualifiesForReduced({ isMatCustomer: false }))
  })

  await section("computing validity", async () => {
    const from = new Date('2026-01-31T10:00:00Z')
    add('7 Monate werden addiert', expiryFrom(from, 7).getMonth() === 7)
    const short = expiryFrom(new Date('2026-03-01T10:00:00Z'), 0.25)
    add('Unter einem Monat wird in Tagen gerechnet',
      Math.round((short.getTime() - new Date('2026-03-01T10:00:00Z').getTime()) / 864e5) === 8,
      short.toISOString())
  })

  await section("only someone eligible sees the reduced pass", async () => {
    const plain = await mkCustomer(c)
    const young = await mkCustomer(c)
    await payload.update({ collection: 'users', id: young.id, data: { birthYear: new Date().getFullYear() - 20 } })
    const youngFresh: any = await payload.findByID({ collection: 'users', id: young.id, depth: 0 })

    const forPlain = await listPurchasable(payload, plain)
    const forYoung = await listPurchasable(payload, youngFresh)
    add('Standardkundin sieht keinen reduzierten Tarif',
      forPlain.every((t: any) => t.tier === 'standard'))
    add('Young Member sieht auch den reduzierten Tarif',
      forYoung.some((t: any) => t.tier === 'reduced'))
    add('Young Member sieht mindestens so viele Abos', forYoung.length > forPlain.length,
      `${forYoung.length} vs ${forPlain.length}`)
  })

  await section("an order does not enable booking", async () => {
    const u = await mkCustomer(c)
    const type = (await payload.find({
      collection: 'abo-types',
      where: { and: [{ tier: { equals: 'standard' } }, { voucherOnly: { not_equals: true } }] },
      sort: 'sortOrder', limit: 1, depth: 0,
    })).docs[0] as any

    const r = await orderAbo(payload, u.id, type.id, 'on_site')
    add('Bestellung wird angenommen', r.ok, why(r))
    const aboId = (r as any).aboId
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('Abo ist offen, nicht aktiv', abo.status === 'pending', abo.status)
    add('Zahlungsart gespeichert', abo.paymentMethod === 'on_site', abo.paymentMethod)
    add('Bestellzeitpunkt gespeichert', Boolean(abo.orderedAt))

    add('Offene Bestellung zählt nicht als nutzbares Abo',
      (await findUsableAbo(payload, u.id)) === null)

    const s = await mkSession(c)
    const b = await createBooking(payload, u.id, s.id)
    add('Mit offener Bestellung kann nicht gebucht werden', !b.ok, why(b))

    add('Bestätigungsmail verschickt', (await mails(c, u.id, 'abo_ordered')).length === 1)
    const open = await getOpenOrder(payload, u.id)
    add('Offene Bestellung ist auffindbar', open?.id === aboId)

    const twice = await orderAbo(payload, u.id, type.id, 'on_site')
    add('Zweite offene Bestellung wird abgewiesen', !twice.ok, why(twice))
  })

  await section("confirming the payment is what releases it", async () => {
    const u = await mkCustomer(c)
    const type = (await payload.find({
      collection: 'abo-types',
      where: { and: [{ tier: { equals: 'standard' } }, { credits: { greater_than: 1 } }, { voucherOnly: { not_equals: true } }] },
      sort: 'sortOrder', limit: 1, depth: 0,
    })).docs[0] as any
    const r = await orderAbo(payload, u.id, type.id, 'transfer')
    const aboId = (r as any).aboId

    const paidAt = new Date()
    const conf = await confirmPayment(payload, aboId, paidAt)
    add('Freischaltung gelingt', conf.ok, conf.reason)
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('Abo ist aktiv', abo.status === 'active', abo.status)
    add('Guthaben entspricht dem Abo', abo.creditsRemaining === type.credits, `${abo.creditsRemaining}`)
    add('Zahlungsdatum gespeichert', Boolean(abo.paidAt))
    add('Gültigkeit läuft ab der Freischaltung',
      Math.abs(new Date(abo.expiresAt).getTime() -
        expiryFrom(paidAt, type.validMonths).getTime()) < 60000,
      abo.expiresAt)
    add('Freischaltungsmail verschickt', (await mails(c, u.id, 'abo_activated')).length === 1)

    add('Jetzt ist das Abo nutzbar', (await findUsableAbo(payload, u.id))?.id === aboId)
    const s = await mkSession(c)
    const b = await createBooking(payload, u.id, s.id)
    add('Nach Freischaltung kann gebucht werden', b.ok, why(b))

    const again = await confirmPayment(payload, aboId)
    add('Zweite Freischaltung wird abgewiesen', !again.ok, again.reason)
  })

  await section("withdrawing an order", async () => {
    const u = await mkCustomer(c)
    const other = await mkCustomer(c)
    const type = (await payload.find({
      collection: 'abo-types',
      where: { and: [{ tier: { equals: 'standard' } }, { voucherOnly: { not_equals: true } }] },
      sort: 'sortOrder', limit: 1, depth: 0,
    })).docs[0] as any
    const r = await orderAbo(payload, u.id, type.id)
    const aboId = (r as any).aboId

    const foreign = await cancelOrder(payload, aboId, other.id)
    add('Fremde Bestellung kann nicht zurückgezogen werden', !foreign.ok, foreign.reason)
    const mine = await cancelOrder(payload, aboId, u.id)
    add('Eigene Bestellung kann zurückgezogen werden', mine.ok, mine.reason)
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('Zurückgezogene Bestellung ist storniert', abo.status === 'cancelled', abo.status)
    const conf = await confirmPayment(payload, aboId)
    add('Storniertes kann nicht freigeschaltet werden', !conf.ok, conf.reason)

    const fresh = await orderAbo(payload, u.id, type.id)
    add('Nach dem Zurückziehen ist eine neue Bestellung möglich', fresh.ok, why(fresh))
  })

  await section("the reduced rate without eligibility", async () => {
    const u = await mkCustomer(c)
    const reduced = (await payload.find({
      collection: 'abo-types', where: { tier: { equals: 'reduced' } }, limit: 1, depth: 0,
    })).docs[0] as any
    if (reduced) {
      const r = await orderAbo(payload, u.id, reduced.id)
      add('Reduzierter Tarif ohne Berechtigung abgewiesen', !r.ok, why(r))
      add('Keine Bestellung angelegt', (await getOpenOrder(payload, u.id)) === null)
    } else {
      add('Reduzierter Tarif ist eingerichtet', false, 'kein reduced abo-type vorhanden')
    }
  })

  await section("a voucher pass only with a voucher", async () => {
    const voucher = (await payload.find({
      collection: 'abo-types', where: { voucherOnly: { equals: true } }, limit: 1, depth: 0,
    })).docs[0] as any
    if (voucher) {
      const u = await mkCustomer(c)
      const bad = await orderAbo(payload, u.id, voucher.id, 'on_site')
      add('Gutschein-Abo nicht bar bestellbar', !bad.ok, why(bad))
      const good = await orderAbo(payload, u.id, voucher.id, 'voucher')
      add('Mit Gutschein bestellbar', good.ok, why(good))
    } else {
      add('Gutschein-Abo ist eingerichtet', false, 'kein voucherOnly abo-type vorhanden')
    }
  })

  // ------------------------------------------------ the language of a class

  await section("the language is inherited from the instructor", async () => {
    const en = await mkCustomer(c, 'NurEnglisch')
    await payload.update({
      collection: 'users', id: en.id,
      data: { role: 'instructor', teachingLanguages: ['en'] },
    })
    const both = await mkCustomer(c, 'Zweisprachig')
    await payload.update({
      collection: 'users', id: both.id,
      data: { role: 'instructor', teachingLanguages: ['de', 'en'] },
    })

    const s1 = await mkSession(c)
    await payload.update({ collection: 'sessions', id: s1.id, data: { instructor: en.id } })
    const loaded1: any = await payload.findByID({ collection: 'sessions', id: s1.id, depth: 1 })
    add('Nur-Englisch-Trainerin ergibt EN', languageLabel(loaded1) === 'EN', languageLabel(loaded1))

    const s2 = await mkSession(c)
    await payload.update({ collection: 'sessions', id: s2.id, data: { instructor: both.id } })
    const loaded2: any = await payload.findByID({ collection: 'sessions', id: s2.id, depth: 1 })
    add('Zweisprachige Trainerin ergibt DE/EN', languageLabel(loaded2) === 'DE/EN', languageLabel(loaded2))

    // Changing an instructor's languages carries to all their classes
    await payload.update({
      collection: 'users', id: en.id, data: { teachingLanguages: ['de', 'en'] },
    })
    const after: any = await payload.findByID({ collection: 'sessions', id: s1.id, depth: 1 })
    add('Änderung an der Trainerin wirkt auf ihre Lektionen',
      languageLabel(after) === 'DE/EN', languageLabel(after))
  })

  await section("a class's language can be overridden", async () => {
    const both = await mkCustomer(c, 'Beides')
    await payload.update({
      collection: 'users', id: both.id,
      data: { role: 'instructor', teachingLanguages: ['de', 'en'] },
    })
    const s = await mkSession(c)
    await payload.update({
      collection: 'sessions', id: s.id,
      data: { instructor: both.id, languages: ['en'] },
    })
    const loaded: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 1 })
    add('Eigene Sprache der Lektion gilt vor der Trainerin',
      languageLabel(loaded) === 'EN', languageLabel(loaded))

    // Set back to empty, the instructor's languages apply again
    await payload.update({ collection: 'sessions', id: s.id, data: { languages: [] } })
    const back: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 1 })
    add('Leer gelassen gelten wieder die Sprachen der Trainerin',
      languageLabel(back) === 'DE/EN', languageLabel(back))
  })

  await section("a missing language breaks nothing", async () => {
    const none = await mkCustomer(c, 'OhneSprache')
    await payload.update({ collection: 'users', id: none.id, data: { role: 'instructor' } })
    const s = await mkSession(c)
    await payload.update({ collection: 'sessions', id: s.id, data: { instructor: none.id } })
    const loaded: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 1 })
    add('Ohne hinterlegte Sprache bleibt die Anzeige leer',
      languageLabel(loaded) === '' && sessionLanguages(loaded).length === 0)
    add('Keine Sprache verhindert die Buchung nicht', true)
  })

  await section("classes are 60 minutes", async () => {
    const s = await mkSession(c)
    add('Neue Lektion dauert 60 Minuten', s.durationMinutes === 60, `${s.durationMinutes}`)
  })

  // ------------------------------------------------ calendar

  await section("calendar: days and weeks", async () => {
    add('The week starts on Monday', hetNapja('2026-10-26') === 0, `${hetNapja('2026-10-26')}`)
    add('Sunday is the end of the week', hetNapja('2026-11-01') === 6, `${hetNapja('2026-11-01')}`)
    add('The Monday of the week a Thursday falls in', hetKezdete('2026-10-29') === '2026-10-26', hetKezdete('2026-10-29'))
    add('Sunday still belongs to the previous Monday',
      hetKezdete('2026-11-01') === '2026-10-26', hetKezdete('2026-11-01'))
    add('Crossing a month boundary', napPlusz('2026-10-31', 1) === '2026-11-01', napPlusz('2026-10-31', 1))
    add('Crossing a year boundary backwards',
      napPlusz('2027-01-01', -1) === '2026-12-31', napPlusz('2027-01-01', -1))
    add('February in a leap year has 29 days', honapHossza('2028-02-10') === 29, `${honapHossza('2028-02-10')}`)
    add('February in a non-leap year has 28', honapHossza('2026-02-10') === 28, `${honapHossza('2026-02-10')}`)
  })

  await section("calendar: the days in each view", async () => {
    add('The day view consists of one day', naptarNapjai('nap', '2026-10-29').length === 1)
    const het = naptarNapjai('het', '2026-10-29')
    add('The week view consists of seven days', het.length === 7, `${het.length}`)
    add('The week starts on Monday and ends on Sunday',
      het[0] === '2026-10-26' && het[6] === '2026-11-01', `${het[0]} … ${het[6]}`)

    const honap = naptarNapjai('honap', '2026-10-15')
    add('The month grid returns whole weeks', honap.length % 7 === 0, `${honap.length}`)
    add('The month grid starts on Monday', hetNapja(honap[0]) === 0)
    add('1 October is included', honap.includes('2026-10-01'))
    add('31 October is included', honap.includes('2026-10-31'))
    add('The start of the grid reaches into the previous month',
      !azonosHonap(honap[0], '2026-10-15') || honap[0] === '2026-10-01', honap[0])
  })

  await section("calendar: time bounds around the daylight saving change", async () => {
    // In Switzerland in 2026, clocks go back on 25 October.
    const nyar = naptarHatarok('nap', '2026-10-20')
    add('In summer time the day starts at 22:00 UTC',
      nyar.tol.endsWith('T22:00:00.000Z'), nyar.tol)
    const tel = naptarHatarok('nap', '2026-11-10')
    add('In winter time, at 23:00 UTC',
      tel.tol.endsWith('T23:00:00.000Z'), tel.tol)
    add('The end of a day is the start of the next',
      new Date(tel.ig).getTime() - new Date(tel.tol).getTime() === 24 * 36e5,
      `${(new Date(tel.ig).getTime() - new Date(tel.tol).getTime()) / 36e5} hours`)

    // The day the clocks change is 25 hours long
    const atallas = naptarHatarok('nap', '2026-10-25')
    const orak = (new Date(atallas.ig).getTime() - new Date(atallas.tol).getTime()) / 36e5
    add('The day the clocks change is 25 hours long', orak === 25, `${orak} hours`)
  })

  await section("calendar: the query also covers the date strip", async () => {
    // In day view the strip shows the whole week and marks which days
    // have classes — which needs the week's data, not just the day's.
    const napi = naptarLekerdezes('nap', '2026-10-29')
    const het = naptarHatarok('het', '2026-10-29')
    add('The day view queries the whole week',
      napi.tol === het.tol && napi.ig === het.ig, `${napi.tol} … ${napi.ig}`)

    // In month view the month is the wider range, and must not be narrowed.
    const havi = naptarLekerdezes('honap', '2026-10-15')
    const honap = naptarHatarok('honap', '2026-10-15')
    add('The month view keeps the bounds of the month',
      havi.tol === honap.tol && havi.ig === honap.ig, `${havi.tol} … ${havi.ig}`)

    // At the start of a month the strip's week can reach into the previous one.
    const elsejen = naptarLekerdezes('nap', '2026-11-01')
    add('The week of the strip still fits even when it crosses the month',
      new Date(elsejen.tol) <= new Date(naptarHatarok('het', '2026-11-01').tol))
  })

  await section("calendar: paging", async () => {
    add('Paging by day', naptarLepes('nap', '2026-10-29', 1) === '2026-10-30')
    add('Paging by week', naptarLepes('het', '2026-10-29', 1) === '2026-11-05')
    add('Paging a month forward', naptarLepes('honap', '2026-10-15', 1) === '2026-11-01')
    add('Paging a month back', naptarLepes('honap', '2026-01-15', -1) === '2025-12-01')
    add('Paging by month jumps to the first, not the 15th',
      naptarLepes('honap', '2026-10-15', 1).endsWith('-01'))
  })

  await section("calendar: bad input does not break it", async () => {
    const maKulcs = napKulcsVagyMa(undefined)
    add('A missing date falls back to today', /^\d{4}-\d{2}-\d{2}$/.test(maKulcs), maKulcs)
    add('Nonsense text falls back to today', napKulcsVagyMa('tegnap') === maKulcs)
    add('A non-existent date falls back to today', napKulcsVagyMa('2026-02-30') === maKulcs)
    add('A valid date is kept', napKulcsVagyMa('2026-10-29') === '2026-10-29')
    add('An unknown view falls back to the week', naptarMod('zöldség') === 'het')
    add('A known view is kept', naptarMod('honap') === 'honap')
  })

  await section("calendar: a class lands on the correct day", async () => {
    // A Swiss class starting at 00:30 is still on the previous day in UTC.
    const ejfelUtan = zoneToUtc(2026, 11, 10, 0, 30)
    add('A class just after midnight lands on its own day',
      napKulcs(ejfelUtan) === '2026-11-10', napKulcs(ejfelUtan))
    const estiOra = zoneToUtc(2026, 11, 10, 23, 30)
    add('A late evening class lands on its own day too',
      napKulcs(estiOra) === '2026-11-10', napKulcs(estiOra))
  })

  await section("customer profile: past, future, contact details", async () => {
    const u = await mkCustomer(c, 'Profil')
    await mkAbo(c, u, { credits: 4 })
    await payload.update({
      collection: 'users', id: u.id,
      data: { phone: '079 000 00 00', healthNotes: 'TEST Rücken' },
    })

    // A class they already attended. The booking is made in the
    // future, then the class moves into the past — which is how it
    // happens in reality: time passes.
    const volt = await mkSession(c, { hours: 48 })
    const r1 = await createBooking(payload, u.id, volt.id)
    const mult = new Date(Date.now() - 48 * 36e5).toISOString()
    await payload.update({ collection: 'sessions', id: volt.id, data: { startsAt: mult } })
    if (r1.ok) await markAttendance(payload, r1.bookingId, 'attended')

    // One class they are coming to, and one they cancelled.
    const jon = await mkSession(c, { hours: 72 })
    await createBooking(payload, u.id, jon.id)
    const lemondott = await mkSession(c, { hours: 96 })
    const r3 = await createBooking(payload, u.id, lemondott.id)
    if (r3.ok) await cancelBooking(payload, u.id, r3.bookingId)

    const p = (await kundeProfil(payload, u.id))!
    add('Profil wird geladen', Boolean(p))
    add('Telefonnummer steht im Profil', p.kunde.phone === '079 000 00 00')
    add('Gesundheitlicher Hinweis steht im Profil',
      String(p.kunde.healthNotes).includes('Rücken'))
    add('Besuchte Lektion erscheint in der Vergangenheit',
      p.korabbi.some((o) => o.sessionId === volt.id && o.allapot === 'attended'),
      JSON.stringify(p.korabbi.map((o) => [o.sessionId, o.allapot])))
    add('Lektion mit Titel, nicht nur Datum', p.korabbi[0]?.cim.length > 0, p.korabbi[0]?.cim)
    add('Kommende Lektion erscheint unter „angemeldet für“',
      p.jovobeli.some((o) => o.sessionId === jon.id))
    add('Stornierte kommende Lektion erscheint NICHT',
      !p.jovobeli.some((o) => o.sessionId === lemondott.id),
      JSON.stringify(p.jovobeli.map((o) => o.sessionId)))
    add('Guthaben wird zusammengezählt', p.kreditOsszesen === 2, String(p.kreditOsszesen))
    add('Besuchsstatistik zählt die Anwesenheit', p.megbizhatosag.attended === 1,
      String(p.megbizhatosag.attended))

    const talalt = await kundeLista(payload, 'Profil')
    add('Suche findet die Person über den Namen', talalt.some((x) => x.id === u.id))
    add('Liste zeigt nur, DASS ein Hinweis da ist',
      talalt.find((x) => x.id === u.id)?.egeszseg === true &&
      !JSON.stringify(talalt).includes('Rücken'))
    add('Suche ohne Treffer gibt leere Liste',
      (await kundeLista(payload, 'Zzzz-gibt-es-nicht')).length === 0)
    add('Unbekannte Person gibt null', (await kundeProfil(payload, 999999)) === null)
  })

  await reset(payload)
  return out
}
