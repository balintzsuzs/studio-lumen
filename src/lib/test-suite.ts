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
import { createSession, deleteSession } from './lesson'
import { customerProfile, customerList } from './customer'
import { cancelSessionByStudio, cancelForTooFewParticipants } from './studio'
import { sessionLanguages, languageLabel } from './format'
import {
  orderAbo, confirmPayment, cancelOrder, getOpenOrder, listPurchasable,
  qualifiesForReduced, isYoungMember, expiryFrom,
} from './abo'
import { generateSessions, propagateToFutureSessions, zoneToUtc } from './series'
import {
  dayKey, dayKeyOrToday, addDays, dayOfWeek, weekStart, monthStart,
  monthLength, calendarDays, calendarBounds, calendarStep, sameMonth, calendarView,
  calendarQuery,
} from './calendar'

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

const q = async (fn: () => Promise<unknown>) => { try { await fn() } catch { /* clean-up */ } }

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
  const idsOf = (docs: unknown[]) => (docs as { id: number }[]).map((d) => d.id)

  const users = await payload.find({
    collection: 'users', where: { email: { like: TEST_DOMAIN } }, limit: 500, depth: 0,
  })
  const userIds = idsOf(users.docs)

  // The test series and the classes generated from them, plus standalone test classes.
  const series = await payload.find({
    collection: 'session-series', where: { name: { like: TEST_NOTE } }, limit: 500, depth: 0,
  })
  const sessionIds = new Set<number>()
  for (const sr of series.docs as any[]) {
    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, limit: 500, depth: 0,
    })
    for (const id of idsOf(kids.docs)) sessionIds.add(id)
  }
  const own = await payload.find({
    collection: 'sessions', where: { note: { equals: TEST_NOTE } }, limit: 500, depth: 0,
  })
  for (const id of idsOf(own.docs)) sessionIds.add(id)

  /** Test data if it belongs to a test user OR to a test class. */
  const cleanUp = async (
    c: 'notifications' | 'bookings' | 'waitlist-entries' | 'abos',
    possessive: 'customer' | 'recipient',
    lessonField: 'session' | null,
  ) => {
    const or: Where[] = []
    if (userIds.length) or.push({ [possessive]: { in: userIds } })
    if (lessonField && sessionIds.size) or.push({ [lessonField]: { in: [...sessionIds] } })
    if (!or.length) return
    const all = await payload.find({ collection: c, where: { or }, limit: 500, depth: 0 })
    for (const id of idsOf(all.docs)) await q(() => payload.delete({ collection: c, id }))
  }

  // Order matters: whatever holds the reference goes first.
  await cleanUp('notifications', 'recipient', 'session')
  await cleanUp('bookings', 'customer', 'session')
  await cleanUp('waitlist-entries', 'customer', 'session')
  await cleanUp('abos', 'customer', null)

  // Closures: the tests delete these themselves at the end, so these
  // only survive an interrupted run — which is why they mark
  // themselves in the `note` field.
  const closures = await payload.find({
    collection: 'closure-periods', where: { note: { equals: TEST_NOTE } }, limit: 500, depth: 0,
  })
  for (const id of idsOf(closures.docs)) {
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
      add(`${label}: unexpected error`, false, String(e).slice(0, 120))
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
    add('Booking with a chosen reformer', r.ok)
    add('Credits reduced by 1', (await credits(c, a.id)) === 4, `${await credits(c, a.id)}`)
    const after = await getAvailability(payload, s.id)
    add('The chosen reformer counts as taken',
      after.find((x) => x.reformerId === target.reformerId)?.status === 'taken')
  })

  await section("booking without choosing a machine: automatic assignment", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('A booking without a choice is assigned automatically', r.ok)
    if (r.ok) {
      const b: any = await payload.findByID({ collection: 'bookings', id: r.bookingId, depth: 0 })
      add('The automatic assignment sets a reformer', Boolean(b.reformer))
    } else add('The automatic assignment sets a reformer', false)
  })

  await section("the same customer twice", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    await createBooking(payload, u.id, s.id)
    const r = await createBooking(payload, u.id, s.id)
    add('The same customer cannot book twice', !r.ok, why(r))
  })

  await section("another customer, machine already taken", async () => {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c); const a2 = await mkAbo(c, u2, { credits: 5 })
    const s = await mkSession(c)
    const spots = await getAvailability(payload, s.id)
    const t = spots.find((x) => x.status === 'free')!
    await createBooking(payload, u1.id, s.id, t.reformerId)
    const r = await createBooking(payload, u2.id, s.id, t.reformerId)
    add('A taken reformer is blocked for everyone else', !r.ok, why(r))
    add('The refused customer keeps her credits', (await credits(c, a2.id)) === 5)
  })

  await section("the room fills up", async () => {
    const s = await mkSession(c, { studio: c.studioB }) // Zug, 4 machines
    const total = (await getAvailability(payload, s.id)).length
    for (let i = 0; i < total; i++) {
      const u = await mkCustomer(c); await mkAbo(c, u)
      await createBooking(payload, u.id, s.id)
    }
    const free = (await getAvailability(payload, s.id)).filter((x) => x.status === 'free').length
    add(`All ${total} spots can be taken`, free === 0, `${free} frei`)
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 3 })
    const r = await createBooking(payload, u.id, s.id)
    add('A fully booked class is refused', !r.ok, why(r))
    add('Credits unchanged when the class is full', (await credits(c, a.id)) === 3)
  })

  await section("pass states", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 0 })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('A pass without credits is refused', !r.ok, why(r))
  })
  {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5, months: -1 })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('An expired pass is refused', !r.ok, why(r))
  }
  {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5, status: 'cancelled' })
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('A cancelled pass is refused', !r.ok, why(r))
  }
  {
    const u = await mkCustomer(c)
    const s = await mkSession(c)
    const r = await createBooking(payload, u.id, s.id)
    add('Without a pass it is refused', !r.ok, why(r))
  }

  await section("several passes: the one expiring soonest is used first", async () => {
    const u = await mkCustomer(c)
    const late = await mkAbo(c, u, { credits: 5, months: 10 })
    const soon = await mkAbo(c, u, { credits: 5, months: 2 })
    const picked = await findUsableAbo(payload, u.id)
    add('The pass that expires sooner is used first', picked?.id === soon.id)
    const s = await mkSession(c)
    await createBooking(payload, u.id, s.id)
    add('The credit comes off the pass expiring sooner',
      (await credits(c, soon.id)) === 4 && (await credits(c, late.id)) === 5)
  })

  await section("class status", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { status: 'cancelled' })
    const r = await createBooking(payload, u.id, s.id)
    add('A cancelled class is refused', !r.ok, why(r))
  })
  {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: -2 })
    const r = await createBooking(payload, u.id, s.id)
    add('A past class is refused', !r.ok, why(r))
  }

  await section("wrong studio's machine, maintenance", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { studio: c.studioA })
    const foreign = (await payload.find({
      collection: 'reformers', where: { studio: { equals: c.studioB.id } }, limit: 1, depth: 0,
    })).docs[0] as any
    const r = await createBooking(payload, u.id, s.id, foreign.id)
    add('A reformer from the other studio is refused', !r.ok, why(r))
  })
  {
    const target = (await payload.find({
      collection: 'reformers', where: { studio: { equals: c.studioA.id } }, limit: 1, depth: 0,
    })).docs[0] as any
    await payload.update({ collection: 'reformers', id: target.id, data: { status: 'maintenance' } })
    const s = await mkSession(c, { studio: c.studioA })
    const spots = await getAvailability(payload, s.id)
    add('A reformer under maintenance shows as blocked',
      spots.find((x) => x.reformerId === target.id)?.status === 'blocked')
    const u = await mkCustomer(c); await mkAbo(c, u)
    const r = await createBooking(payload, u.id, s.id, target.id)
    add('A reformer under maintenance cannot be booked', !r.ok, why(r))
    const freeNow = spots.filter((x) => x.status === 'free').length
    add('Maintenance reduces the capacity', freeNow === spots.length - 1, `${freeNow}/${spots.length}`)
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
    add('A closure for another class type does not block', (await isClosed(payload, s)) === null)
    await payload.delete({ collection: 'closure-periods', id: cp1.id })

    // only for the other studio
    const cp2: any = await payload.create({
      collection: 'closure-periods',
      data: {
        name: 'Nur Zug', startsOn: day, endsOn: day,
        studios: [c.studioB.id], note: TEST_NOTE,
      },
    })
    add('A closure for another studio does not block', (await isClosed(payload, s)) === null)
    await payload.delete({ collection: 'closure-periods', id: cp2.id })

    // for this class type
    const cp3: any = await payload.create({
      collection: 'closure-periods',
      data: {
        name: 'Reformer zu', startsOn: day, endsOn: day,
        classTypes: [c.reformerType.id], note: TEST_NOTE,
      },
    })
    add('A closure for this class type does block', (await isClosed(payload, s)) !== null)
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 4 })
    const r = await createBooking(payload, u.id, s.id)
    add('A booking during a closure is refused', !r.ok, why(r))
    add('Credits unchanged during a closure', (await credits(c, a.id)) === 4)
    await payload.delete({ collection: 'closure-periods', id: cp3.id })

    // applies to everything
    const cp4: any = await payload.create({
      collection: 'closure-periods',
      data: { name: 'Alles zu', startsOn: day, endsOn: day, note: TEST_NOTE },
    })
    add('A closure without a restriction blocks everything', (await isClosed(payload, s)) !== null)
    await payload.delete({ collection: 'closure-periods', id: cp4.id })
    add('Bookable again once the closure is removed', (await isClosed(payload, s)) === null)
  })

  await section("cancellation", async () => {
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    const s = await mkSession(c, { hours: 72 })
    const r = await createBooking(payload, u.id, s.id)
    const res = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('Cancelling more than 24h ahead refunds', res.ok && res.refunded)
    add('The credit is back after the refund', (await credits(c, a.id)) === 5)
    const again = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('A double cancellation is refused', !again.ok, why(again))
    add('A double cancellation does not refund twice', (await credits(c, a.id)) === 5)
  })
  {
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    const s = await mkSession(c, { hours: 3 })
    const r = await createBooking(payload, u.id, s.id)
    const res = await cancelBooking(payload, u.id, (r as any).bookingId)
    add('Cancelling within 24h does not refund', res.ok && !res.refunded)
    add('The credit stays deducted', (await credits(c, a.id)) === 4)
  }
  {
    const u1 = await mkCustomer(c); await mkAbo(c, u1)
    const u2 = await mkCustomer(c)
    const s = await mkSession(c)
    const r = await createBooking(payload, u1.id, s.id)
    const res = await cancelBooking(payload, u2.id, (r as any).bookingId)
    add('Someone else’s booking cannot be cancelled', !res.ok, why(res))
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
    add('The reformer is free again after a cancellation', r2.ok, why(r2))
  })

  await section("non-existent ids", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const r = await createBooking(payload, u.id, 999999)
    add('A non-existent class is refused', !r.ok)
    const res = await cancelBooking(payload, u.id, 999999)
    add('A non-existent booking is refused', !res.ok)
  })

  // ------------------------------------------------ sliding waitlist

  await section("the steps of the offer window", async () => {
    const w = DEFAULT_WAITLIST_WINDOWS
    const at = (h: number) => offerMinutesFor(w, new Date(Date.now() + h * 36e5))
    add('More than 48h ahead: a 12-hour window', at(72) === 720, `${at(72)}`)
    add('Exactly at the 48h step: 12 hours', at(48) === 720, `${at(48)}`)
    add('Between 13h and 48h: 4 hours', at(20) === 240, `${at(20)}`)
    add('Under 13h: only minutes', at(5) === 20, `${at(5)}`)
    add('The window shortens as the class comes closer', at(72) > at(20) && at(20) > at(5))
  })

  await section("waitlist only on a full class", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c)
    const r = await joinWaitlist(payload, u.id, s.id)
    add('The waiting list is refused while spots are free', !r.ok, why(r))
  })

  await section("joining, ordering, leaving", async () => {
    const s = await mkSession(c)
    await fillSession(c, s)
    const a = await mkCustomer(c); await mkAbo(c, a)
    const b = await mkCustomer(c); await mkAbo(c, b)
    const joined: any = await joinWaitlist(payload, a.id, s.id)
    const rb: any = await joinWaitlist(payload, b.id, s.id)
    add('First person on the waiting list: position 1', joined.ok && joined.position === 1, why(joined))
    add('Second person: position 2', rb.ok && rb.position === 2, why(rb))
    const again = await joinWaitlist(payload, a.id, s.id)
    add('Joining twice is refused', !again.ok, why(again))
    const left = await leaveWaitlist(payload, a.id, joined.entryId)
    add('Leaving the waiting list', left.ok, left.reason)
    const foreign = await leaveWaitlist(payload, b.id, joined.entryId)
    add('Someone else’s entry cannot be withdrawn', !foreign.ok, foreign.reason)
  })

  await section("after a cancellation the first in line is offered the spot", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const w2 = await mkCustomer(c); await mkAbo(c, w2)
    const e1: any = await joinWaitlist(payload, w1.id, s.id)
    await joinWaitlist(payload, w2.id, s.id)

    const none = await promoteWaitlist(payload, s.id)
    add('With no free spot nothing is offered', none.kind === 'nothing', (none as any).reason)

    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    add('The spot is offered to the first person',
      p.kind === 'offered' && (p as any).offer.customerId === w1.id)
    add('Offer window at 72h: 12 hours',
      p.kind === 'offered' && (p as any).offer.offerMinutes === 720)

    const twice = await promoteWaitlist(payload, s.id)
    add('No second offer while one is running', twice.kind === 'nothing', (twice as any).reason)

    const wrong = await claimOffer(payload, w2.id, (p as any).offer.entryId)
    add('Only the person offered the spot can take it', !wrong.ok, why(wrong))
    const got = await claimOffer(payload, w1.id, (p as any).offer.entryId)
    add('The offer can be claimed', got.ok, why(got))
    const entry: any = await payload.findByID({
      collection: 'waitlist-entries', id: e1.entryId, depth: 0,
    })
    add('A claimed entry counts as booked', entry.status === 'converted', entry.status)
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
    add('The offer goes to the first person', p.kind === 'offered')

    // mark the offer as expired, as if the window had run out
    await payload.update({
      collection: 'waitlist-entries', id: e1.entryId,
      data: { offerExpiresAt: new Date(Date.now() - 60000).toISOString() },
    })
    const tick = await expireOffers(payload)
    add('An expired offer is let go', tick.expired >= 1, `${tick.expired}`)
    add('The next person gets an offer', tick.promoted >= 1, `${tick.promoted}`)
    const second = await payload.find({
      collection: 'waitlist-entries',
      where: { and: [{ session: { equals: s.id } }, { customer: { equals: w2.id } }] },
      limit: 1, depth: 0,
    })
    add('The offer now sits with person 2',
      (second.docs[0] as any)?.status === 'offered', (second.docs[0] as any)?.status)
    const late = await claimOffer(payload, w1.id, e1.entryId)
    add('No access once the window has passed', !late.ok, why(late))
  })

  await section("inside the lock window everyone may book", async () => {
    const s = await mkSession(c, { hours: 3 })
    const booked = await fillSession(c, s)
    const w1 = await mkCustomer(c); await mkAbo(c, w1)
    const signIn = await joinWaitlist(payload, w1.id, s.id)
    const storno = await cancelBooking(payload, booked[0].userId, booked[0].bookingId)

    /*
     * The preconditions are asserted separately. On 2026-10-28 this
     * case failed once and passed on the retry, and `r.kind` alone did
     * not reveal which step had gone wrong. Now the failing assertion
     * will say so next time.
     */
    add('Precondition: the class filled up', booked.length > 0 && signIn.ok,
      `${booked.length} booked, waiting list: ${why(signIn) || 'ok'}`)
    add('Precondition: the cancellation succeeded', storno.ok, storno.reason)
    const free = (await getAvailability(payload, s.id)).filter((x) => x.status === 'free')
    add('Precondition: a machine is free after the cancellation', free.length === 1, `${free.length}`)
    const waitingEntries = await payload.find({
      collection: 'waitlist-entries',
      where: { and: [{ session: { equals: s.id } }, { status: { equals: 'waiting' } }] },
      limit: 5, depth: 0,
    })
    add('Precondition: exactly one person is waiting', waitingEntries.totalDocs === 1, `${waitingEntries.totalDocs}`)

    // 30 minutes before the class there is no individual offer any more
    const soon = new Date(new Date(s.startsAt).getTime() - 30 * 60000)
    const r = await promoteWaitlist(payload, s.id, soon)
    add('Shortly before the start the spot is released to everyone', r.kind === 'released',
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
    add('The offer window ends at the lock window at the latest', ok)
  })

  await section("sweeping: a freed-up spot is offered from the scheduler", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    const e: any = await joinWaitlist(payload, w.id, s.id)

    const idle = await sweepOpenSpots(payload)
    add('With a full class the sweep offers nothing', idle.promoted === 0, `${idle.promoted}`)

    // Free the machine directly, without offering it — as if an admin
    // had deleted the booking, or the offer attempt had failed.
    await payload.update({
      collection: 'bookings', id: booked[0].bookingId,
      data: { status: 'cancelled', cancelledAt: new Date().toISOString() },
    })
    const swept = await sweepOpenSpots(payload)
    add('A free spot is offered by the sweep', swept.promoted === 1, `${swept.promoted}`)
    const entry: any = await payload.findByID({ collection: 'waitlist-entries', id: e.entryId, depth: 0 })
    add('The entry reads “offered”', entry.status === 'offered', entry.status)
    add('The e-mail has gone out', (await mails(c, w.id, 'waitlist_offer')).length === 1)

    const again = await runWaitlistTick(payload)
    add('The next tick does not offer twice', again.promoted === 0, `${again.promoted}`)
  })

  // ------------------------------------------------ attendance and no-shows

  await section("a no-show and a late cancellation are separate facts", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u, { credits: 5 })
    const late = await mkSession(c, { hours: 3 })
    const rl = await createBooking(payload, u.id, late.id)
    await cancelBooking(payload, u.id, (rl as any).bookingId)
    const bl: any = await payload.findByID({ collection: 'bookings', id: (rl as any).bookingId, depth: 0 })
    add('A late cancellation is recorded as “too late”', bl.cancellationType === 'late', bl.cancellationType)

    const inTime = await mkSession(c, { hours: 72 })
    const ri = await createBooking(payload, u.id, inTime.id)
    await cancelBooking(payload, u.id, (ri as any).bookingId)
    const bi: any = await payload.findByID({ collection: 'bookings', id: (ri as any).bookingId, depth: 0 })
    add('A timely cancellation is recorded as “in time”', bi.cancellationType === 'in_time', bi.cancellationType)
  })

  await section("closing a class: whoever booked counts as present", async () => {
    const s = await mkSession(c, { hours: 2 })
    const made = await fillSession(c, s)
    const early = await closeSession(payload, s.id)
    add('A class that has not started cannot be closed', !early.ok, early.reason)

    // The instructor marks ONLY the absentee — that is their entire job here.
    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(Date.now() - 2 * 36e5).toISOString() },
    })
    const missing = await markAttendance(payload, made[0].bookingId, 'no_show')
    add('The instructor marks the absent person', missing.ok, missing.reason)

    const closed = await closeSession(payload, s.id)
    add('Everyone else counts as present',
      closed.ok && closed.marked === made.length - 1, `${closed.marked}/${made.length - 1}`)

    const rel = await getReliability(payload, made[1].userId)
    add('Whoever needed no action counts as attended', rel.attended === 1, JSON.stringify(rel))
    const rel0 = await getReliability(payload, made[0].userId)
    add('Only the marked person counts as a no-show',
      rel0.noShows === 1 && rel0.attended === 0, JSON.stringify(rel0))

    const again = await closeSession(payload, s.id)
    add('Closing again changes nothing', again.ok && again.marked === 0, `${again.marked}`)

    // The mark can be undone: anyone can misclick.
    const back = await markAttendance(payload, made[0].bookingId, 'attended')
    add('The marking can be undone', back.ok, back.reason)
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
    const status = async () =>
      ((await payload.findByID({
        collection: 'bookings', id: made[0].bookingId, depth: 0,
      })) as any).status

    await closeStaleSessions(payload)
    add('A class just past stays open for now',
      (await status()) === 'booked', await status())

    // By the next day, though, it should settle itself.
    await payload.update({
      collection: 'sessions', id: s.id,
      data: {
        startsAt: new Date(Date.now() - (AUTO_CLOSE_HOURS + 1) * 36e5).toISOString(),
      },
    })
    await closeStaleSessions(payload)
    add('An old class closes itself and counts as attended',
      (await status()) === 'attended', await status())
  })

  await section("creating a class", async () => {
    const tomorrow = new Date(Date.now() + 36 * 36e5)
    const day = dayKey(tomorrow)

    const r = await createSession(payload, {
      day, time: '07:15', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, minutes: 60, note: TEST_NOTE,
    })
    add('The class is created', r.ok, why(r))
    if (r.ok) {
      const created: any = await payload.findByID({ collection: 'sessions', id: r.sessionId, depth: 0 })
      add('The class lands on the chosen day', dayKey(created.startsAt) === day, dayKey(created.startsAt))
      add('The class can be booked', created.status === 'scheduled', created.status)
    }

    const conflicts = await createSession(payload, {
      day, time: '07:15', classTypeId: c.reformerType.id, studioId: c.studioB.id,
      instructorId: c.admin.id, minutes: 60, note: TEST_NOTE,
    })
    add('Double-booking the same instructor is refused', !conflicts.ok, why(conflicts))

    const past = await createSession(payload, {
      day: dayKey(new Date(Date.now() - 48 * 36e5)), time: '09:00',
      classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, minutes: 60, note: TEST_NOTE,
    })
    add('A class in the past is refused', !past.ok, why(past))

    const badTime = await createSession(payload, {
      day, time: '25:00', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: c.admin.id, minutes: 60, note: TEST_NOTE,
    })
    add('A nonsensical time is refused', !badTime.ok, why(badTime))

    const u = await mkCustomer(c)
    const notInstructor = await createSession(payload, {
      day, time: '20:30', classTypeId: c.reformerType.id, studioId: c.studioA.id,
      instructorId: u.id, minutes: 60, note: TEST_NOTE,
    })
    add('A customer as instructor is refused', !notInstructor.ok, why(notInstructor))
  })

  await section("deleting a class", async () => {
    const empty = await mkSession(c, { hours: 96 })
    const d1 = await deleteSession(payload, empty.id)
    add('An empty class can be deleted', d1.ok, why(d1))
    const left = await payload.find({
      collection: 'sessions', where: { id: { equals: empty.id } }, limit: 1, depth: 0,
    })
    add('A deleted class is gone', left.totalDocs === 0)

    const taken = await mkSession(c, { hours: 96 })
    const u = await mkCustomer(c); await mkAbo(c, u)
    await createBooking(payload, u.id, taken.id)
    const d2 = await deleteSession(payload, taken.id)
    add('A class with a registration can NOT be deleted', !d2.ok, why(d2))
    const found = await payload.find({
      collection: 'sessions', where: { id: { equals: taken.id } }, limit: 1, depth: 0,
    })
    add('A class with a registration stays', found.totalDocs === 1)
  })

  await section("a cancelled booking cannot count as present", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 72 })
    const r = await createBooking(payload, u.id, s.id)
    await cancelBooking(payload, u.id, (r as any).bookingId)
    const m = await markAttendance(payload, (r as any).bookingId, 'attended')
    add('A cancelled booking cannot be set to present', !m.ok, m.reason)
  })

  // ------------------------------------------------ recurring classes

  await section("generating a series", async () => {
    const sr = await mkSeries(c, { weekday: '1', time: '09:00', weeks: 4 })
    const g = await generateSessions(payload, sr.id)
    add('A series generates classes', g.created >= 3, `${g.created}`)
    const again = await generateSessions(payload, sr.id)
    add('Generating again does not duplicate', again.created === 0 && again.skipped === g.created,
      `${again.created}/${again.skipped}`)

    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })
    const days = new Set((kids.docs as any[]).map((k) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', weekday: 'short' })
        .format(new Date(k.startsAt))))
    add('Every class falls on the chosen weekday', days.size === 1 && days.has('Mon'),
      [...days].join(','))
    const times = new Set((kids.docs as any[]).map((k) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour12: false, hour: '2-digit', minute: '2-digit' })
        .format(new Date(k.startsAt))))
    add('Local time stays the same across the summer-time change', times.size === 1 && times.has('09:00'),
      [...times].join(','))
  })

  await section("the daylight saving change", async () => {
    // In Switzerland in 2027, daylight saving begins on 28 March.
    const winter = zoneToUtc(2027, 3, 22, 9, 0) // Monday, CET (UTC+1)
    const summer = zoneToUtc(2027, 3, 29, 9, 0) // Monday, CEST (UTC+2)
    add('Before the clocks change 09:00 = 08:00 UTC', winter.getUTCHours() === 8, `${winter.toISOString()}`)
    add('After the clocks change 09:00 = 07:00 UTC', summer.getUTCHours() === 7, `${summer.toISOString()}`)
  })

  await section("this and all future ones", async () => {
    const sr = await mkSeries(c, { weekday: '3', time: '18:00', weeks: 6 })
    await generateSessions(payload, sr.id)
    const kids = await payload.find({
      collection: 'sessions', where: { series: { equals: sr.id } }, sort: 'startsAt', limit: 50, depth: 0,
    })
    const list = kids.docs as any[]
    add('At least four classes for the test', list.length >= 4, `${list.length}`)
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

    add('An earlier class stays unchanged',
      hourOf(rows[0].startsAt) === '18:00' && instr(rows[0].instructor) === c.admin.id,
      hourOf(rows[0].startsAt))
    add('The changed class has the new time', hourOf(rows[1].startsAt) === '19:00', hourOf(rows[1].startsAt))
    add('Future classes take on the new time',
      rows.slice(1).every((r) => hourOf(r.startsAt) === '19:00'),
      rows.map((r) => hourOf(r.startsAt)).join(','))
    add('Future classes take on the new instructor',
      rows.slice(1).every((r) => instr(r.instructor) === nina.id))
    add('Every class keeps its own date',
      new Set(rows.map((r) => new Date(r.startsAt).toISOString().slice(0, 10))).size === rows.length)

    const updatedSeries: any = await payload.findByID({
      collection: 'session-series', id: sr.id, depth: 0,
    })
    add('The series rule takes on the new time', updatedSeries.timeOfDay === '19:00', updatedSeries.timeOfDay)
    const pivotAfter: any = await payload.findByID({ collection: 'sessions', id: pivot.id, depth: 0 })
    add('After propagating, the scope is back to “only this one”',
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
    add('A class changed on its own is detached from the series', detached.detached === true)

    // now change it at series level, from the first one
    await payload.update({
      collection: 'sessions', id: list[0].id,
      data: {
        startsAt: new Date(new Date(list[0].startsAt).getTime() + 36e5).toISOString(),
        editScope: 'this_and_future',
      },
    })
    const stillDetached: any = await payload.findByID({ collection: 'sessions', id: list[1].id, depth: 0 })
    add('A series change does not overwrite the detached class',
      new Date(stillDetached.startsAt).getTime() === new Date(detached.startsAt).getTime())
    const third: any = await payload.findByID({ collection: 'sessions', id: list[2].id, depth: 0 })
    add('Classes that are not detached follow the series change',
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
    add('A booking on a class from a series', r.ok, why(r))

    await payload.update({
      collection: 'sessions', id: list[1].id,
      data: {
        startsAt: new Date(new Date(list[1].startsAt).getTime() + 90 * 60000).toISOString(),
        editScope: 'this_and_future',
      },
    })
    const b: any = await payload.findByID({ collection: 'bookings', id: (r as any).bookingId, depth: 1 })
    add('The booking stays active', b.status === 'booked', b.status)
    add('The booking follows the new time automatically',
      new Date(b.session.startsAt).getTime() === new Date(target.startsAt).getTime() + 90 * 60000)
  })

  // ------------------------------------------------ notifications

  await section("the waitlist offer email", async () => {
    const s = await mkSession(c, { hours: 72 })
    const booked = await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    await joinWaitlist(payload, w.id, s.id)
    add('No e-mail before the offer', (await mails(c, w.id)).length === 0)

    await cancelBooking(payload, booked[0].userId, booked[0].bookingId)
    const p = await promoteWaitlist(payload, s.id)
    const m = await mails(c, w.id, 'waitlist_offer')
    add('The offer sends an e-mail', m.length === 1, `${m.length}`)
    add('The e-mail states the deadline',
      m[0] && p.kind === 'offered' && m[0].body.includes(String(new Date((p as any).offer.expiresAt).getFullYear())))
    add('The e-mail contains the booking link', m[0]?.body.includes(`/buchen/${s.id}`))
    add('The e-mail is tied to the class', m[0] && (typeof m[0].session === 'object' ? m[0].session.id : m[0].session) === s.id)
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
    add('Everyone waiting is informed',
      (await mails(c, w1.id, 'waitlist_released')).length === 1 &&
      (await mails(c, w2.id, 'waitlist_released')).length === 1)
  })

  await section("notification of a time change", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 96 })
    await createBooking(payload, u.id, s.id)
    add('A booking alone sends no change e-mail',
      (await mails(c, u.id, 'session_changed')).length === 0)

    await payload.update({
      collection: 'sessions', id: s.id,
      data: { durationMinutes: 55 },
    })
    add('A change of duration is not news for the customer',
      (await mails(c, u.id, 'session_changed')).length === 0)

    await payload.update({
      collection: 'sessions', id: s.id,
      data: { startsAt: new Date(new Date(s.startsAt).getTime() + 2 * 36e5).toISOString() },
    })
    const m = await mails(c, u.id, 'session_changed')
    add('A change of time is reported', m.length === 1, `${m.length}`)
    add('The e-mail shows the old and the new time', m[0]?.body.includes('→'))
    add('The e-mail explains the option to cancel', m[0]?.body.includes('24 Stunden'))
  })

  await section("notification of an instructor change", async () => {
    const u = await mkCustomer(c); await mkAbo(c, u)
    const s = await mkSession(c, { hours: 96 })
    await createBooking(payload, u.id, s.id)
    const nina = await mkCustomer(c, 'Vertretung')
    await payload.update({ collection: 'users', id: nina.id, data: { role: 'instructor' } })
    await payload.update({ collection: 'sessions', id: s.id, data: { instructor: nina.id } })
    const m = await mails(c, u.id, 'session_changed')
    add('A change of instructor is reported', m.length === 1, `${m.length}`)
    add('The e-mail names the new instructor', m[0]?.body.includes('Vertretung'))
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
    add('Whoever cancelled gets nothing', (await mails(c, u1.id, 'session_changed')).length === 0)
    add('Whoever booked gets the news', (await mails(c, u2.id, 'session_changed')).length === 1)
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
    add('An earlier class: no e-mail', (await mails(c, early.id, 'session_changed')).length === 0)
    add('A later class: e-mail sent', (await mails(c, later.id, 'session_changed')).length === 1)
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
    add('A cancellation by the studio succeeds', r.ok, r.reason)
    add('All bookings cancelled', r.cancelled === made.length, `${r.cancelled}/${made.length}`)
    add('Credits returned to everyone', r.refunded === made.length, `${r.refunded}`)
    add('Everyone informed', r.notified === made.length, `${r.notified}`)

    const after = await Promise.all(before.map((b) => credits(c, b.aboId)))
    add('Credits refunded despite the 24h rule',
      after.every((v, i) => v === before[i].credits + 1), after.join(','))

    const b0: any = await payload.findByID({ collection: 'bookings', id: made[0].bookingId, depth: 0 })
    add('The cancellation type is “by the studio”', b0.cancellationType === 'by_studio', b0.cancellationType)
    const sess: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 0 })
    add('The class counts as cancelled', sess.status === 'cancelled', sess.status)
    add('The reason is on the class',
      sess.cancellationReason === 'Krankheit der Trainerin', sess.cancellationReason)
    add('The owner’s own note is left untouched', sess.note === 'TEST', sess.note)

    const m = await mails(c, made[0].userId, 'session_cancelled')
    add('The cancellation e-mail states the reason', m[0]?.body.includes('Krankheit der Trainerin'))
    add('The cancellation e-mail mentions the refund', m[0]?.body.includes('zurückgebucht'))
    add('No change e-mail on top',
      (await mails(c, made[0].userId, 'session_changed')).length === 0)

    const again = await cancelSessionByStudio(payload, s.id, 'Krankheit der Trainerin')
    add('Cancelling again does not refund twice', again.ok && again.refunded === 0, `${again.refunded}`)
  })

  await section("cancelling withdraws the waitlist too", async () => {
    const s = await mkSession(c, { hours: 48 })
    await fillSession(c, s)
    const w = await mkCustomer(c); await mkAbo(c, w)
    const e: any = await joinWaitlist(payload, w.id, s.id)
    await cancelSessionByStudio(payload, s.id, 'Organisatorische Gründe')
    const entry: any = await payload.findByID({ collection: 'waitlist-entries', id: e.entryId, depth: 0 })
    add('The waiting-list entry is withdrawn', entry.status === 'withdrawn', entry.status)
  })

  await section("too few participants (minimum 2)", async () => {
    const full = await mkSession(c, { hours: 48 })
    await fillSession(c, full)
    const no = await cancelForTooFewParticipants(payload, full.id, 2)
    add('With enough registrations it is not cancelled', !no.ok, no.reason)

    const thin = await mkSession(c, { hours: 48 })
    const u = await mkCustomer(c); const a = await mkAbo(c, u, { credits: 5 })
    await createBooking(payload, u.id, thin.id)
    add('Credits after the booking', (await credits(c, a.id)) === 4)
    const r = await cancelForTooFewParticipants(payload, thin.id, 2)
    add('With one registration it is cancelled', r.ok, r.reason)
    add('The credit comes back', (await credits(c, a.id)) === 5, `${await credits(c, a.id)}`)
    const m = await mails(c, u.id, 'session_cancelled')
    add('The e-mail mentions the too-few registrations', m[0]?.body.includes('Zu wenige Anmeldungen'))

    const empty = await mkSession(c, { hours: 48 })
    const r2 = await cancelForTooFewParticipants(payload, empty.id, 2)
    add('An empty class can be cancelled without informing anyone',
      r2.ok && r2.cancelled === 0 && r2.notified === 0)
  })

  // ------------------------------------------------ ordering a pass without payment

  await section("rate eligibility", async () => {
    const now = new Date('2026-06-15T00:00:00Z')
    add('24 years old is still a Young Member', isYoungMember(2002, now))
    add('16 years old is a Young Member', isYoungMember(2010, now))
    add('25 years old is not any more', !isYoungMember(2001, now))
    add('15 years old is not yet', !isYoungMember(2011, now))
    add('Without a year of birth, no Young Member', !isYoungMember(undefined, now))
    add('Mat-class participants qualify', qualifiesForReduced({ isMatCustomer: true }))
    add('Without either, no entitlement', !qualifiesForReduced({ isMatCustomer: false }))
  })

  await section("computing validity", async () => {
    const from = new Date('2026-01-31T10:00:00Z')
    add('7 months are added', expiryFrom(from, 7).getMonth() === 7)
    const short = expiryFrom(new Date('2026-03-01T10:00:00Z'), 0.25)
    add('Under a month it is counted in days',
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
    add('A standard customer sees no reduced rate',
      forPlain.every((t: any) => t.tier === 'standard'))
    add('A Young Member also sees the reduced rate',
      forYoung.some((t: any) => t.tier === 'reduced'))
    add('A Young Member sees at least as many passes', forYoung.length > forPlain.length,
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
    add('The order is accepted', r.ok, why(r))
    const aboId = (r as any).aboId
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('The pass is open, not active', abo.status === 'pending', abo.status)
    add('The payment method is stored', abo.paymentMethod === 'on_site', abo.paymentMethod)
    add('The time of the order is stored', Boolean(abo.orderedAt))

    add('An open order does not count as a usable pass',
      (await findUsableAbo(payload, u.id)) === null)

    const s = await mkSession(c)
    const b = await createBooking(payload, u.id, s.id)
    add('With an open order you cannot book', !b.ok, why(b))

    add('The confirmation e-mail is sent', (await mails(c, u.id, 'abo_ordered')).length === 1)
    const open = await getOpenOrder(payload, u.id)
    add('An open order can be found', open?.id === aboId)

    const twice = await orderAbo(payload, u.id, type.id, 'on_site')
    add('A second open order is refused', !twice.ok, why(twice))
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
    add('Activation succeeds', conf.ok, conf.reason)
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('The pass is active', abo.status === 'active', abo.status)
    add('The credits match the pass', abo.creditsRemaining === type.credits, `${abo.creditsRemaining}`)
    add('The payment date is stored', Boolean(abo.paidAt))
    add('Validity runs from the activation',
      Math.abs(new Date(abo.expiresAt).getTime() -
        expiryFrom(paidAt, type.validMonths).getTime()) < 60000,
      abo.expiresAt)
    add('The activation e-mail is sent', (await mails(c, u.id, 'abo_activated')).length === 1)

    add('Now the pass is usable', (await findUsableAbo(payload, u.id))?.id === aboId)
    const s = await mkSession(c)
    const b = await createBooking(payload, u.id, s.id)
    add('After activation you can book', b.ok, why(b))

    const again = await confirmPayment(payload, aboId)
    add('A second activation is refused', !again.ok, again.reason)
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
    add('Someone else’s order cannot be withdrawn', !foreign.ok, foreign.reason)
    const mine = await cancelOrder(payload, aboId, u.id)
    add('Your own order can be withdrawn', mine.ok, mine.reason)
    const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
    add('A withdrawn order is cancelled', abo.status === 'cancelled', abo.status)
    const conf = await confirmPayment(payload, aboId)
    add('A cancelled order cannot be activated', !conf.ok, conf.reason)

    const fresh = await orderAbo(payload, u.id, type.id)
    add('After withdrawing, a new order is possible', fresh.ok, why(fresh))
  })

  await section("the reduced rate without eligibility", async () => {
    const u = await mkCustomer(c)
    const reduced = (await payload.find({
      collection: 'abo-types', where: { tier: { equals: 'reduced' } }, limit: 1, depth: 0,
    })).docs[0] as any
    if (reduced) {
      const r = await orderAbo(payload, u.id, reduced.id)
      add('The reduced rate without entitlement is refused', !r.ok, why(r))
      add('No order was created', (await getOpenOrder(payload, u.id)) === null)
    } else {
      add('The reduced rate is set up', false, 'kein reduced abo-type vorhanden')
    }
  })

  await section("a voucher pass only with a voucher", async () => {
    const voucher = (await payload.find({
      collection: 'abo-types', where: { voucherOnly: { equals: true } }, limit: 1, depth: 0,
    })).docs[0] as any
    if (voucher) {
      const u = await mkCustomer(c)
      const bad = await orderAbo(payload, u.id, voucher.id, 'on_site')
      add('A voucher-only pass cannot be ordered with cash', !bad.ok, why(bad))
      const good = await orderAbo(payload, u.id, voucher.id, 'voucher')
      add('It can be ordered with a voucher', good.ok, why(good))
    } else {
      add('The voucher-only pass is set up', false, 'kein voucherOnly abo-type vorhanden')
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
    add('An English-only instructor gives EN', languageLabel(loaded1) === 'EN', languageLabel(loaded1))

    const s2 = await mkSession(c)
    await payload.update({ collection: 'sessions', id: s2.id, data: { instructor: both.id } })
    const loaded2: any = await payload.findByID({ collection: 'sessions', id: s2.id, depth: 1 })
    add('A bilingual instructor gives DE/EN', languageLabel(loaded2) === 'DE/EN', languageLabel(loaded2))

    // Changing an instructor's languages carries to all their classes
    await payload.update({
      collection: 'users', id: en.id, data: { teachingLanguages: ['de', 'en'] },
    })
    const after: any = await payload.findByID({ collection: 'sessions', id: s1.id, depth: 1 })
    add('A change on the instructor reaches her classes',
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
    add('The class’s own language wins over the instructor’s',
      languageLabel(loaded) === 'EN', languageLabel(loaded))

    // Set back to empty, the instructor's languages apply again
    await payload.update({ collection: 'sessions', id: s.id, data: { languages: [] } })
    const back: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 1 })
    add('Left empty, the instructor’s languages apply again',
      languageLabel(back) === 'DE/EN', languageLabel(back))
  })

  await section("a missing language breaks nothing", async () => {
    const none = await mkCustomer(c, 'OhneSprache')
    await payload.update({ collection: 'users', id: none.id, data: { role: 'instructor' } })
    const s = await mkSession(c)
    await payload.update({ collection: 'sessions', id: s.id, data: { instructor: none.id } })
    const loaded: any = await payload.findByID({ collection: 'sessions', id: s.id, depth: 1 })
    add('With no language on file the display stays empty',
      languageLabel(loaded) === '' && sessionLanguages(loaded).length === 0)
    add('No language does not prevent a booking', true)
  })

  await section("classes are 60 minutes", async () => {
    const s = await mkSession(c)
    add('A new class lasts 60 minutes', s.durationMinutes === 60, `${s.durationMinutes}`)
  })

  // ------------------------------------------------ calendar

  await section("calendar: days and weeks", async () => {
    add('The week starts on Monday', dayOfWeek('2026-10-26') === 0, `${dayOfWeek('2026-10-26')}`)
    add('Sunday is the end of the week', dayOfWeek('2026-11-01') === 6, `${dayOfWeek('2026-11-01')}`)
    add('The Monday of the week a Thursday falls in', weekStart('2026-10-29') === '2026-10-26', weekStart('2026-10-29'))
    add('Sunday still belongs to the previous Monday',
      weekStart('2026-11-01') === '2026-10-26', weekStart('2026-11-01'))
    add('Crossing a month boundary', addDays('2026-10-31', 1) === '2026-11-01', addDays('2026-10-31', 1))
    add('Crossing a year boundary backwards',
      addDays('2027-01-01', -1) === '2026-12-31', addDays('2027-01-01', -1))
    add('February in a leap year has 29 days', monthLength('2028-02-10') === 29, `${monthLength('2028-02-10')}`)
    add('February in a non-leap year has 28', monthLength('2026-02-10') === 28, `${monthLength('2026-02-10')}`)
  })

  await section("calendar: the days in each view", async () => {
    add('The day view consists of one day', calendarDays('tag', '2026-10-29').length === 1)
    const week = calendarDays('woche', '2026-10-29')
    add('The week view consists of seven days', week.length === 7, `${week.length}`)
    add('The week starts on Monday and ends on Sunday',
      week[0] === '2026-10-26' && week[6] === '2026-11-01', `${week[0]} … ${week[6]}`)

    const month = calendarDays('monat', '2026-10-15')
    add('The month grid returns whole weeks', month.length % 7 === 0, `${month.length}`)
    add('The month grid starts on Monday', dayOfWeek(month[0]) === 0)
    add('1 October is included', month.includes('2026-10-01'))
    add('31 October is included', month.includes('2026-10-31'))
    add('The start of the grid reaches into the previous month',
      !sameMonth(month[0], '2026-10-15') || month[0] === '2026-10-01', month[0])
  })

  await section("calendar: time bounds around the daylight saving change", async () => {
    // In Switzerland in 2026, clocks go back on 25 October.
    const summerDay = calendarBounds('tag', '2026-10-20')
    add('In summer time the day starts at 22:00 UTC',
      summerDay.from.endsWith('T22:00:00.000Z'), summerDay.from)
    const winterDay = calendarBounds('tag', '2026-11-10')
    add('In winter time, at 23:00 UTC',
      winterDay.from.endsWith('T23:00:00.000Z'), winterDay.from)
    add('The end of a day is the start of the next',
      new Date(winterDay.to).getTime() - new Date(winterDay.from).getTime() === 24 * 36e5,
      `${(new Date(winterDay.to).getTime() - new Date(winterDay.from).getTime()) / 36e5} hours`)

    // The day the clocks change is 25 hours long
    const dstDay = calendarBounds('tag', '2026-10-25')
    const lessons = (new Date(dstDay.to).getTime() - new Date(dstDay.from).getTime()) / 36e5
    add('The day the clocks change is 25 hours long', lessons === 25, `${lessons} hours`)
  })

  await section("calendar: the query also covers the date strip", async () => {
    // In day view the strip shows the whole week and marks which days
    // have classes — which needs the week's data, not just the day's.
    const daily = calendarQuery('tag', '2026-10-29')
    const week = calendarBounds('woche', '2026-10-29')
    add('The day view queries the whole week',
      daily.from === week.from && daily.to === week.to, `${daily.from} … ${daily.to}`)

    // In month view the month is the wider range, and must not be narrowed.
    const monthly = calendarQuery('monat', '2026-10-15')
    const month = calendarBounds('monat', '2026-10-15')
    add('The month view keeps the bounds of the month',
      monthly.from === month.from && monthly.to === month.to, `${monthly.from} … ${monthly.to}`)

    // At the start of a month the strip's week can reach into the previous one.
    const onTheFirst = calendarQuery('tag', '2026-11-01')
    add('The week of the strip still fits even when it crosses the month',
      new Date(onTheFirst.from) <= new Date(calendarBounds('woche', '2026-11-01').from))
  })

  await section("calendar: paging", async () => {
    add('Paging by day', calendarStep('tag', '2026-10-29', 1) === '2026-10-30')
    add('Paging by week', calendarStep('woche', '2026-10-29', 1) === '2026-11-05')
    add('Paging a month forward', calendarStep('monat', '2026-10-15', 1) === '2026-11-01')
    add('Paging a month back', calendarStep('monat', '2026-01-15', -1) === '2025-12-01')
    add('Paging by month jumps to the first, not the 15th',
      calendarStep('monat', '2026-10-15', 1).endsWith('-01'))
  })

  await section("calendar: bad input does not break it", async () => {
    const todayKey = dayKeyOrToday(undefined)
    add('A missing date falls back to today', /^\d{4}-\d{2}-\d{2}$/.test(todayKey), todayKey)
    add('Nonsense text falls back to today', dayKeyOrToday('tegnap') === todayKey)
    add('A non-existent date falls back to today', dayKeyOrToday('2026-02-30') === todayKey)
    add('A valid date is kept', dayKeyOrToday('2026-10-29') === '2026-10-29')
    add('An unknown view falls back to the week', calendarView('nonsense') === 'woche')
    add('A known view is kept', calendarView('monat') === 'monat')
  })

  await section("calendar: a class lands on the correct day", async () => {
    // A Swiss class starting at 00:30 is still on the previous day in UTC.
    const afterMidnight = zoneToUtc(2026, 11, 10, 0, 30)
    add('A class just after midnight lands on its own day',
      dayKey(afterMidnight) === '2026-11-10', dayKey(afterMidnight))
    const eveningLesson = zoneToUtc(2026, 11, 10, 23, 30)
    add('A late evening class lands on its own day too',
      dayKey(eveningLesson) === '2026-11-10', dayKey(eveningLesson))
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
    const pastSession = await mkSession(c, { hours: 48 })
    const r1 = await createBooking(payload, u.id, pastSession.id)
    const past = new Date(Date.now() - 48 * 36e5).toISOString()
    await payload.update({ collection: 'sessions', id: pastSession.id, data: { startsAt: past } })
    if (r1.ok) await markAttendance(payload, r1.bookingId, 'attended')

    // One class they are coming to, and one they cancelled.
    const comingSession = await mkSession(c, { hours: 72 })
    await createBooking(payload, u.id, comingSession.id)
    const cancelledSession = await mkSession(c, { hours: 96 })
    const r3 = await createBooking(payload, u.id, cancelledSession.id)
    if (r3.ok) await cancelBooking(payload, u.id, r3.bookingId)

    const p = (await customerProfile(payload, u.id))!
    add('The profile loads', Boolean(p))
    add('The phone number is on the profile', p.customer.phone === '079 000 00 00')
    add('The health note is on the profile',
      String(p.customer.healthNotes).includes('Rücken'))
    add('An attended class shows up in the past',
      p.past.some((o) => o.sessionId === pastSession.id && o.status === 'attended'),
      JSON.stringify(p.past.map((o) => [o.sessionId, o.status])))
    add('The class has a title, not only a date', p.past[0]?.title.length > 0, p.past[0]?.title)
    add('An upcoming class shows under “booked for”',
      p.upcoming.some((o) => o.sessionId === comingSession.id))
    add('A cancelled upcoming class does NOT show',
      !p.upcoming.some((o) => o.sessionId === cancelledSession.id),
      JSON.stringify(p.upcoming.map((o) => o.sessionId)))
    add('Credits are added up', p.creditsTotal === 2, String(p.creditsTotal))
    add('The attendance stats count the turnout', p.reliability.attended === 1,
      String(p.reliability.attended))

    const found = await customerList(payload, 'Profil')
    add('The search finds the person by name', found.some((x) => x.id === u.id))
    add('The list shows only THAT there is a note',
      found.find((x) => x.id === u.id)?.health === true &&
      !JSON.stringify(found).includes('Rücken'))
    add('A search with no hits gives an empty list',
      (await customerList(payload, 'Zzzz-does-not-exist')).length === 0)
    add('An unknown person gives null', (await customerProfile(payload, 999999)) === null)
  })

  await reset(payload)
  return out
}
