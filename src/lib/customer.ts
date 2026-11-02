import 'server-only'
import type { Payload } from 'payload'
import { getReliability, type Reliability } from './attendance'
import { isYoungMember } from './abo'

/**
 * The full picture of one customer, from the studio's side.
 *
 * The class page tells you who is coming TODAY; this tells you who this
 * person is: how to reach them, what to know before the class, which
 * classes they attended and which ones they are booked into. Until now
 * that question could only be answered in the Payload admin, with
 * several clicks and by hunting down the bookings by hand.
 *
 * A single query fetches the bookings, and they are split into past and
 * future here — not two queries, because the boundary ("now") is a
 * single moment, and asking twice could let it drift in between.
 */

export type CustomerLesson = {
  bookingId: number
  sessionId: number
  /** Start time, ISO. */
  start: string
  title: string
  instructor?: string
  studio?: string
  reformer?: string
  /** Booking status, as the raw value — the page supplies the wording. */
  status: string
  /** For a cancellation: in time, late, or cancelled by the studio. */
  cancellationType?: string
}

export type CustomerProfile = {
  customer: any
  /** Young Member derived from the birth year, not from a separate flag. */
  youngMember: boolean
  passes: any[]
  /** Total credits across the active passes. */
  creditsTotal: number
  /** Soonest class first. */
  upcoming: CustomerLesson[]
  /** Most recent class first. */
  past: CustomerLesson[]
  reliability: Reliability
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

const lessonRow = (b: any): CustomerLesson | null => {
  const s = b.session
  // If the relation did not come back as an object there is nothing to
  // show — a bare id gives neither a time nor a name.
  if (!s || typeof s !== 'object') return null
  return {
    bookingId: b.id,
    sessionId: s.id,
    start: s.startsAt,
    title: s.classType?.name ?? '',
    instructor: s.instructor?.firstName ?? undefined,
    studio: s.studio?.city ?? undefined,
    reformer: b.reformer?.label ?? undefined,
    status: b.status,
    cancellationType: b.cancellationType ?? undefined,
  }
}

/** One customer's profile. `null` if there is no such person. */
export const customerProfile = async (
  payload: Payload,
  customerId: number,
): Promise<CustomerProfile | null> => {
  let customer: any = null
  try {
    customer = await payload.findByID({ collection: 'users', id: customerId, depth: 0 })
  } catch {
    return null
  }
  if (!customer) return null

  const passes = await payload.find({
    collection: 'abos',
    where: { customer: { equals: customerId } },
    sort: '-purchasedAt', limit: 50, depth: 1,
  })

  /*
   * depth 2, because we need the class NAME, its instructor and its
   * studio: on the booking the class is a relation, and inside it the
   * type is another one. At one level we would get only ids, and the
   * list would show dates with no titles.
   */
  const bookings = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: customerId } },
    sort: '-bookedAt', limit: 500, depth: 2,
  })

  const now = Date.now()
  const upcoming: CustomerLesson[] = []
  const past: CustomerLesson[] = []
  for (const b of bookings.docs as any[]) {
    const row = lessonRow(b)
    if (!row) continue
    // A cancelled booking is not future attendance: the person is not
    // coming. In the past it stays, because it is part of the record.
    const future = new Date(row.start).getTime() > now
    if (future && row.status === 'cancelled') continue
    ;(future ? upcoming : past).push(row)
  }
  upcoming.sort((a, b) => a.start.localeCompare(b.start))
  past.sort((a, b) => b.start.localeCompare(a.start))

  const livePasses = (passes.docs as any[]).filter((a) => a.status === 'active')

  return {
    customer,
    youngMember: isYoungMember(customer.birthYear),
    passes: passes.docs as any[],
    creditsTotal: livePasses.reduce((sum, a) => sum + (a.creditsRemaining ?? 0), 0),
    upcoming,
    past,
    reliability: await getReliability(payload, customerId),
  }
}

export type CustomerRow = {
  id: number
  name: string
  email: string
  phone?: string
  /** Whether a health note exists — its content is not shown in the list. */
  health: boolean
  youngMember: boolean
}

/**
 * The customer list, searchable by name and email.
 *
 * Only the EXISTENCE of a health note shows here, never its content.
 * It is sensitive data, the list shows many people at once, and nobody
 * needs to read it until they are looking at one specific person. The
 * full text lives on the profile and on the class register, where the
 * instructor is dealing with that one person.
 */
export const customerList = async (
  payload: Payload,
  search?: string,
): Promise<CustomerRow[]> => {
  const and: any[] = [{ role: { equals: 'customer' } }]
  const q = search?.trim()
  if (q) and.push({ or: [{ fullName: { like: q } }, { email: { like: q } }] })

  const r = await payload.find({
    collection: 'users',
    where: { and },
    sort: 'fullName', limit: 500, depth: 0,
  })

  return (r.docs as any[]).map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
    email: u.email,
    phone: u.phone || undefined,
    health: Boolean(u.healthNotes),
    youngMember: isYoungMember(u.birthYear),
  }))
}

export { idOf }
