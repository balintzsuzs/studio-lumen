import 'server-only'
import type { HibaKulcs } from './i18n'
import { closeStaleSessions } from './attendance'
import type { Payload } from 'payload'
import { getSettings, getAvailability, createBooking, type WaitlistWindow } from './booking'
import { waitlistOffer, waitlistReleased } from './notify'

/**
 * Waitlist with a sliding offer window.
 *
 * Industry practice (FitDegree, Hapana, Momence) does not give a fixed
 * time to respond, but a shorter one the closer the class is: with more
 * than 48 hours to go it can be 12 hours, under 13 hours only minutes.
 * A fixed 6 hours would be meaningless two hours before a class.
 *
 * Inside `waitlistLockHours` nobody gets an exclusive offer any more:
 * the spot opens to everyone at once and the people waiting are told
 * they can book.
 */

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

/** The offer window for this class, in minutes. */
export const offerMinutesFor = (windows: WaitlistWindow[], startsAt: Date, now = new Date()): number => {
  const hoursLeft = (startsAt.getTime() - now.getTime()) / 36e5
  const sorted = [...windows].sort((a, b) => b.fromHoursBefore - a.fromHoursBefore)
  for (const w of sorted) if (hoursLeft >= w.fromHoursBefore) return w.offerMinutes
  // If every step is above us (e.g. the class has started), the shortest applies.
  return sorted[sorted.length - 1]?.offerMinutes ?? 20
}

export type JoinResult = { ok: true; entryId: number; position: number } | { ok: false; reason: HibaKulcs }

/** Joining the waitlist. Only for a full class, and only once. */
export const joinWaitlist = async (
  payload: Payload,
  userId: number,
  sessionId: number,
): Promise<JoinResult> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.ora_nincs' }
  }
  if (session.status === 'cancelled') return { ok: false, reason: 'hiba.ora_lemondva' }
  if (new Date(session.startsAt) <= new Date())
    return { ok: false, reason: 'hiba.ora_elkezdodott' }

  const free = (await getAvailability(payload, sessionId)).filter((r) => r.status === 'free')
  if (free.length) return { ok: false, reason: 'hiba.van_szabad_hely' }

  const own = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { customer: { equals: userId } },
        { status: { in: ['waiting', 'offered'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (own.totalDocs > 0) return { ok: false, reason: 'hiba.mar_varolistan' }

  const all = await payload.find({
    collection: 'waitlist-entries',
    where: { session: { equals: sessionId } },
    sort: '-position', limit: 1, depth: 0,
  })
  const position = ((all.docs as any[])[0]?.position ?? 0) + 1

  const entry = await payload.create({
    collection: 'waitlist-entries',
    data: { session: sessionId, customer: userId, position, status: 'waiting' },
  })
  return { ok: true, entryId: entry.id as number, position }
}

/** Leaving the waitlist. */
export const leaveWaitlist = async (
  payload: Payload,
  userId: number,
  entryId: number,
): Promise<{ ok: boolean; reason?: HibaKulcs }> => {
  let entry: any = null
  try {
    entry = await payload.findByID({ collection: 'waitlist-entries', id: entryId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.bejegyzes_nincs' }
  }
  if (idOf(entry.customer) !== userId) return { ok: false, reason: 'hiba.nem_a_te_bejegyzesed' }
  await payload.update({
    collection: 'waitlist-entries', id: entryId, data: { status: 'withdrawn' },
  })
  return { ok: true }
}

export type Offer = {
  entryId: number
  customerId: number
  sessionId: number
  expiresAt: Date
  offerMinutes: number
}

export type PromoteResult =
  | { kind: 'offered'; offer: Offer }
  | { kind: 'released'; entryIds: number[] } // inside the lock window: open to everyone
  | { kind: 'nothing'; reason: HibaKulcs }

/**
 * Offers a freed-up spot to the first person in the queue.
 * Called both after a cancellation and from the one-minute scheduler,
 * and is idempotent: if a live offer already exists, it does not issue
 * a second one.
 */
export const promoteWaitlist = async (
  payload: Payload,
  sessionId: number,
  now = new Date(),
): Promise<PromoteResult> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { kind: 'nothing', reason: 'hiba.ora_nem_talalhato' }
  }
  const startsAt = new Date(session.startsAt)
  if (session.status === 'cancelled' || startsAt <= now)
    return { kind: 'nothing', reason: 'hiba.ora_nem_foglalhato' }

  const free = (await getAvailability(payload, sessionId)).filter((r) => r.status === 'free')
  if (!free.length) return { kind: 'nothing', reason: 'hiba.nincs_szabad_hely' }

  // Is there already a live offer? Then let it run out.
  const live = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { status: { equals: 'offered' } },
        { offerExpiresAt: { greater_than: now.toISOString() } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (live.totalDocs > 0) return { kind: 'nothing', reason: 'hiba.mar_fut_ajanlat' }

  const waiting = await payload.find({
    collection: 'waitlist-entries',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'waiting' } }] },
    sort: 'position', limit: 100, depth: 0,
  })
  if (!waiting.docs.length) return { kind: 'nothing', reason: 'hiba.senki_a_varolistan' }

  const { waitlistWindows, waitlistLockHours } = await getSettings(payload)
  const hoursLeft = (startsAt.getTime() - now.getTime()) / 36e5

  // Too close to the class: no point waiting on one person — open it to all.
  if (hoursLeft < waitlistLockHours) {
    const ids: number[] = []
    for (const e of waiting.docs as any[]) {
      await payload.update({
        collection: 'waitlist-entries', id: e.id,
        data: { status: 'expired', notifiedAt: now.toISOString() },
      })
      ids.push(e.id)
      await waitlistReleased(payload, idOf(e.customer), sessionId)
    }
    return { kind: 'released', entryIds: ids }
  }

  const first = (waiting.docs as any[])[0]
  const offerMinutes = offerMinutesFor(waitlistWindows, startsAt, now)
  // An offer must never reach past the start of the lock window.
  const latest = new Date(startsAt.getTime() - waitlistLockHours * 36e5)
  const expiresAt = new Date(Math.min(now.getTime() + offerMinutes * 60000, latest.getTime()))

  await payload.update({
    collection: 'waitlist-entries', id: first.id,
    data: {
      status: 'offered',
      notifiedAt: now.toISOString(),
      offerExpiresAt: expiresAt.toISOString(),
    },
  })

  await waitlistOffer(payload, idOf(first.customer), sessionId, expiresAt)

  return {
    kind: 'offered',
    offer: {
      entryId: first.id,
      customerId: idOf(first.customer),
      sessionId,
      expiresAt,
      offerMinutes,
    },
  }
}

/**
 * Every future class where someone is waiting and a spot has opened up.
 *
 * Cancelling already offers the spot on its own, but not every opening
 * goes through a cancellation: a machine comes back from maintenance,
 * an admin deletes a booking, or an offer attempt fails once. This
 * sweep catches those, which is why the scheduler always runs it.
 */
export const sweepOpenSpots = async (
  payload: Payload,
  now = new Date(),
): Promise<{ promoted: number }> => {
  const waiting = await payload.find({
    collection: 'waitlist-entries',
    where: { status: { equals: 'waiting' } },
    limit: 500, depth: 0,
  })
  const sessionIds = [...new Set((waiting.docs as any[]).map((e) => idOf(e.session)))]

  let promoted = 0
  for (const sessionId of sessionIds) {
    const r = await promoteWaitlist(payload, sessionId, now)
    if (r.kind === 'offered' || r.kind === 'released') promoted++
  }
  return { promoted }
}

/**
 * Expires offers that have run out and offers the spot to the next
 * person. Meant to be called from a scheduler (in this prototype, the
 * /setup/waitlist-tick route).
 */
export const expireOffers = async (
  payload: Payload,
  now = new Date(),
): Promise<{ expired: number; promoted: number }> => {
  const stale = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { status: { equals: 'offered' } },
        { offerExpiresAt: { less_than_equal: now.toISOString() } },
      ],
    },
    limit: 200, depth: 0,
  })

  const touched = new Set<number>()
  for (const e of stale.docs as any[]) {
    await payload.update({
      collection: 'waitlist-entries', id: e.id, data: { status: 'expired' },
    })
    touched.add(idOf(e.session))
  }

  let promoted = 0
  for (const sessionId of touched) {
    const r = await promoteWaitlist(payload, sessionId, now)
    if (r.kind === 'offered') promoted++
  }
  return { expired: stale.docs.length, promoted }
}

/** One scheduler round: expire offers, then sweep for freed-up spots. */
export const runWaitlistTick = async (
  payload: Payload,
  now = new Date(),
): Promise<{ expired: number; promoted: number; closed: number }> => {
  const a = await expireOffers(payload, now)
  const b = await sweepOpenSpots(payload, now)
  /*
   * Closing long-finished classes gets its beat here, for the same
   * reason as the waitlist: on Vercel's free plan the cron runs only
   * once a day, so the first visitor brings the beat with them.
   */
  const c = await closeStaleSessions(payload, now)
  return { expired: a.expired, promoted: a.promoted + b.promoted, closed: c.sessions }
}

/**
 * Claiming the offer: the person on the waitlist books the freed-up
 * spot. Only possible with their own offer, and only while it is live.
 */
export const claimOffer = async (
  payload: Payload,
  userId: number,
  entryId: number,
  reformerId?: number,
  now = new Date(),
): Promise<{ ok: true; bookingId: number } | { ok: false; reason: HibaKulcs }> => {
  let entry: any = null
  try {
    entry = await payload.findByID({ collection: 'waitlist-entries', id: entryId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.bejegyzes_nincs' }
  }
  if (idOf(entry.customer) !== userId) return { ok: false, reason: 'hiba.nem_a_te_bejegyzesed' }
  if (entry.status !== 'offered') return { ok: false, reason: 'hiba.nincs_ajanlatod' }
  if (!entry.offerExpiresAt || new Date(entry.offerExpiresAt) <= now)
    return { ok: false, reason: 'hiba.ajanlat_lejart' }

  const booked = await createBooking(payload, userId, idOf(entry.session), reformerId)
  if (!booked.ok) return booked

  await payload.update({
    collection: 'waitlist-entries', id: entryId, data: { status: 'converted' },
  })
  return booked
}

/** The customer's current waitlist entry for this class, if any. */
export const getMyEntry = async (
  payload: Payload,
  userId: number,
  sessionId: number,
): Promise<any | null> => {
  const r = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { customer: { equals: userId } },
        { status: { in: ['waiting', 'offered'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  return (r.docs as any[])[0] ?? null
}

/** How many people are still waiting for this class. */
export const countWaiting = async (payload: Payload, sessionId: number): Promise<number> =>
  (await payload.find({
    collection: 'waitlist-entries',
    where: { and: [{ session: { equals: sessionId } }, { status: { in: ['waiting', 'offered'] } }] },
    limit: 0, depth: 0,
  })).totalDocs

/**
 * Lazy scheduler: runs on page load, but at most once a minute.
 *
 * On Vercel's free plan a cron job may run **only once a day** — a
 * per-minute schedule is rejected at deploy time. A waitlist offer,
 * however, expires in minutes, so this is what provides the real beat:
 * whoever opens the schedule also turns the crank. The daily cron stays
 * alongside it as a safety net for when nobody visits the site.
 *
 * The time of the last run lives in the BookingSettings global, not in
 * memory, because serverless instances do not share memory.
 */
export const maybeTick = async (
  payload: Payload,
  minIntervalSeconds = 60,
  now = new Date(),
): Promise<{ ran: boolean; expired?: number; promoted?: number; closed?: number }> => {
  try {
    const settings: any = await payload.findGlobal({ slug: 'booking-settings' })
    const last = settings?.lastWaitlistTickAt ? new Date(settings.lastWaitlistTickAt) : null
    if (last && (now.getTime() - last.getTime()) / 1000 < minIntervalSeconds) {
      return { ran: false }
    }

    // Mark that we are running first, so that of two simultaneous
    // requests only one goes through. This does not rule out every
    // race, but offering also checks for a live offer itself.
    await payload.updateGlobal({
      slug: 'booking-settings',
      data: { lastWaitlistTickAt: now.toISOString() },
    })

    const r = await runWaitlistTick(payload, now)
    return { ran: true, ...r }
  } catch {
    // The scheduler must never hold up rendering the schedule.
    return { ran: false }
  }
}
