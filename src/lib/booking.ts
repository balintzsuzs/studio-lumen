import 'server-only'
import type { ErrorKey } from './i18n'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Payload } from 'payload'

/**
 * The business logic of booking, with the studio's rules:
 *
 *  - cancel at least 24 hours ahead, otherwise the credit is forfeited
 *  - a minimum of 2 participants; if the studio cancels, the credit
 *    always comes back
 *  - no classes during a closure period
 *  - pass credits and expiry are checked
 */

export type Availability = {
  reformerId: number
  label: string
  row: number
  column: number
  status: 'free' | 'taken' | 'blocked'
}

export type WaitlistWindow = { fromHoursBefore: number; offerMinutes: number }

/**
 * The sliding waitlist window, for when the setting is not configured
 * yet. The closer the class, the shorter the time to respond —
 * otherwise a freed-up spot simply goes unused.
 */
export const DEFAULT_WAITLIST_WINDOWS: WaitlistWindow[] = [
  { fromHoursBefore: 48, offerMinutes: 720 },
  { fromHoursBefore: 13, offerMinutes: 240 },
  { fromHoursBefore: 0, offerMinutes: 20 },
]

export const getClient = async (): Promise<Payload> => getPayload({ config })

/** Settings (cancellation deadline and so on), with defaults. */
export const getSettings = async (payload: Payload) => {
  const s = await payload.findGlobal({ slug: 'booking-settings' })
  return {
    cancellationHours: s?.cancellationHours ?? 24,
    waitlistLockHours: s?.waitlistLockHours ?? 1,
    waitlistWindows: (s?.waitlistWindows?.length
      ? s.waitlistWindows
      : DEFAULT_WAITLIST_WINDOWS) as WaitlistWindow[],
    paymentInstructions: (s?.paymentInstructions as string | undefined) ?? '',
    allowReformerChoice: s?.allowReformerChoice ?? true,
  }
}

/** findByID, but returns null for a missing record instead of throwing. */
const findOrNull = async (payload: Payload, collection: any, id: number) => {
  try {
    return await payload.findByID({ collection, id, depth: 0 })
  } catch {
    return null
  }
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

/** Does this class fall inside a closure period? */
export const isClosed = async (payload: Payload, session: any): Promise<string | null> => {
  const start = new Date(session.startsAt)
  const periods = await payload.find({
    collection: 'closure-periods',
    limit: 200,
    depth: 0,
  })
  for (const p of periods.docs as any[]) {
    const from = new Date(p.startsOn)
    const to = new Date(p.endsOn)
    to.setHours(23, 59, 59, 999)
    if (start < from || start > to) continue

    const ct = (p.classTypes ?? []).map(idOf)
    if (ct.length && !ct.includes(idOf(session.classType))) continue

    const st = (p.studios ?? []).map(idOf)
    if (st.length && !st.includes(idOf(session.studio))) continue

    return p.name as string
  }
  return null
}

/** Which machines are free in this class. */
export const getAvailability = async (
  payload: Payload,
  sessionId: number,
): Promise<Availability[]> => {
  const session = await findOrNull(payload, 'sessions', sessionId)
  if (!session) return []
  const studioId = idOf((session as any).studio)

  const reformers = await payload.find({
    collection: 'reformers',
    where: { studio: { equals: studioId } },
    limit: 100,
    depth: 0,
    sort: 'row',
  })

  const bookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }],
    },
    limit: 100,
    depth: 0,
  })
  const taken = new Set((bookings.docs as any[]).map((b) => idOf(b.reformer)))

  return (reformers.docs as any[])
    .map((r) => ({
      reformerId: r.id as number,
      label: r.label as string,
      row: r.row as number,
      column: r.column as number,
      status: (r.status !== 'active'
        ? 'blocked'
        : taken.has(r.id)
          ? 'taken'
          : 'free') as Availability['status'],
    }))
    .sort((a, b) => a.row - b.row || a.column - b.column)
}

/** The customer's usable pass: by expiry and credits, soonest to expire first. */
export const findUsableAbo = async (payload: Payload, userId: number) => {
  const now = new Date().toISOString()
  const abos = await payload.find({
    collection: 'abos',
    where: {
      and: [
        { customer: { equals: userId } },
        { status: { equals: 'active' } },
        { creditsRemaining: { greater_than: 0 } },
        { expiresAt: { greater_than: now } },
      ],
    },
    sort: 'expiresAt',
    limit: 1,
    depth: 0,
  })
  return (abos.docs as any[])[0] ?? null
}

export type BookResult =
  | { ok: true; bookingId: number }
  | { ok: false; reason: ErrorKey }

export const createBooking = async (
  payload: Payload,
  userId: number,
  sessionId: number,
  reformerId?: number,
): Promise<BookResult> => {
  const session: any = await findOrNull(payload, 'sessions', sessionId)
  if (!session) return { ok: false, reason: 'error.class_missing' }
  if (session.status === 'cancelled') return { ok: false, reason: 'error.class_cancelled' }
  if (new Date(session.startsAt) <= new Date())
    return { ok: false, reason: 'error.class_started' }

  const closure = await isClosed(payload, session)
  if (closure) return { ok: false, reason: 'error.closed' }

  // has this person already booked this class
  const own = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { session: { equals: sessionId } },
        { customer: { equals: userId } },
        { status: { equals: 'booked' } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (own.totalDocs > 0) return { ok: false, reason: 'error.already_booked' }

  const abo = await findUsableAbo(payload, userId)
  if (!abo) return { ok: false, reason: 'error.no_valid_pass' }

  const free = (await getAvailability(payload, sessionId)).filter((r) => r.status === 'free')
  if (!free.length) return { ok: false, reason: 'error.class_full' }

  let chosen = reformerId
  if (chosen) {
    if (!free.some((r) => r.reformerId === chosen))
      return { ok: false, reason: 'error.reformer_taken' }
  } else {
    chosen = free[0].reformerId
  }

  // deducting the credit and creating the booking in one transaction
  const tx = await payload.db.beginTransaction?.()
  const req = tx ? ({ transactionID: tx } as any) : undefined
  try {
    await payload.update({
      collection: 'abos', id: abo.id,
      data: { creditsRemaining: abo.creditsRemaining - 1 },
      req,
    })
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        session: sessionId,
        customer: userId,
        reformer: chosen,
        abo: abo.id,
        status: 'booked',
        bookedAt: new Date().toISOString(),
        creditRefunded: false,
      },
      req,
    })
    if (tx) await payload.db.commitTransaction?.(tx)
    return { ok: true, bookingId: booking.id as number }
  } catch (e) {
    if (tx) await payload.db.rollbackTransaction?.(tx)
    return { ok: false, reason: 'error.booking_save_failed' }
  }
}

export const cancelBooking = async (
  payload: Payload,
  userId: number,
  bookingId: number,
): Promise<{ ok: boolean; refunded: boolean; reason?: ErrorKey }> => {
  let booking: any = null
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1 })
  } catch {
    booking = null
  }
  if (!booking) return { ok: false, refunded: false, reason: 'error.booking_not_found' }
  if (idOf(booking.customer) !== userId)
    return { ok: false, refunded: false, reason: 'error.not_your_booking' }
  if (booking.status !== 'booked')
    return { ok: false, refunded: false, reason: 'error.booking_not_active' }

  const { cancellationHours } = await getSettings(payload)
  const start = new Date(booking.session.startsAt).getTime()
  const hoursLeft = (start - Date.now()) / 36e5
  const refund = hoursLeft >= cancellationHours

  const tx = await payload.db.beginTransaction?.()
  const req = tx ? ({ transactionID: tx } as any) : undefined
  try {
    if (refund) {
      const aboId = idOf(booking.abo)
      const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
      await payload.update({
        collection: 'abos', id: aboId,
        data: { creditsRemaining: abo.creditsRemaining + 1 },
        req,
      })
    }
    await payload.update({
      collection: 'bookings', id: bookingId,
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        creditRefunded: refund,
        cancellationType: refund ? 'in_time' : 'late',
      },
      req,
    })
    if (tx) await payload.db.commitTransaction?.(tx)
    return { ok: true, refunded: refund }
  } catch {
    if (tx) await payload.db.rollbackTransaction?.(tx)
    return { ok: false, refunded: false, reason: 'error.cancel_failed' }
  }
}

export type Occupancy = { taken: number; capacity: number; free: number }

/**
 * How full several classes are, in one pass.
 *
 * `getAvailability` asks per class, which for a month view would mean
 * sixty separate queries. This runs two in total: machines per studio,
 * and bookings for all the classes at once.
 *
 * Capacity is the number of active machines — a machine put into
 * maintenance reduces it automatically, exactly as it does at booking
 * time.
 */
export const getOccupancy = async (
  payload: Payload,
  sessions: { id: number; studio: unknown }[],
): Promise<Map<number, Occupancy>> => {
  const out = new Map<number, Occupancy>()
  if (!sessions.length) return out

  const reformers = await payload.find({
    collection: 'reformers',
    where: { status: { equals: 'active' } },
    limit: 200, depth: 0,
  })
  const capacityPerStudio = new Map<number, number>()
  for (const r of reformers.docs as any[]) {
    const s = idOf(r.studio)
    capacityPerStudio.set(s, (capacityPerStudio.get(s) ?? 0) + 1)
  }

  const bookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { session: { in: sessions.map((s) => s.id) } },
        { status: { equals: 'booked' } },
      ],
    },
    limit: 2000, depth: 0,
  })
  const takenPerLesson = new Map<number, number>()
  for (const b of bookings.docs as any[]) {
    const s = idOf(b.session)
    takenPerLesson.set(s, (takenPerLesson.get(s) ?? 0) + 1)
  }

  for (const s of sessions) {
    const capacity = capacityPerStudio.get(idOf(s.studio)) ?? 0
    const taken = takenPerLesson.get(s.id) ?? 0
    out.set(s.id, { taken, capacity, free: Math.max(0, capacity - taken) })
  }
  return out
}
