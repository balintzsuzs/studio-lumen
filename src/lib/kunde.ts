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

export type KundeOra = {
  bookingId: number
  sessionId: number
  /** Start time, ISO. */
  kezdet: string
  cim: string
  oktato?: string
  studio?: string
  gep?: string
  /** Booking status, as the raw value — the page supplies the wording. */
  allapot: string
  /** For a cancellation: in time, late, or cancelled by the studio. */
  lemondasTipus?: string
}

export type KundeProfil = {
  kunde: any
  /** Young Member derived from the birth year, not from a separate flag. */
  youngMember: boolean
  abok: any[]
  /** Total credits across the active passes. */
  kreditOsszesen: number
  /** Soonest class first. */
  jovobeli: KundeOra[]
  /** Most recent class first. */
  korabbi: KundeOra[]
  megbizhatosag: Reliability
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

const oraSor = (b: any): KundeOra | null => {
  const s = b.session
  // If the relation did not come back as an object there is nothing to
  // show — a bare id gives neither a time nor a name.
  if (!s || typeof s !== 'object') return null
  return {
    bookingId: b.id,
    sessionId: s.id,
    kezdet: s.startsAt,
    cim: s.classType?.name ?? '',
    oktato: s.instructor?.firstName ?? undefined,
    studio: s.studio?.city ?? undefined,
    gep: b.reformer?.label ?? undefined,
    allapot: b.status,
    lemondasTipus: b.cancellationType ?? undefined,
  }
}

/** One customer's profile. `null` if there is no such person. */
export const kundeProfil = async (
  payload: Payload,
  kundeId: number,
): Promise<KundeProfil | null> => {
  let kunde: any = null
  try {
    kunde = await payload.findByID({ collection: 'users', id: kundeId, depth: 0 })
  } catch {
    return null
  }
  if (!kunde) return null

  const abok = await payload.find({
    collection: 'abos',
    where: { customer: { equals: kundeId } },
    sort: '-purchasedAt', limit: 50, depth: 1,
  })

  /*
   * depth 2, because we need the class NAME, its instructor and its
   * studio: on the booking the class is a relation, and inside it the
   * type is another one. At one level we would get only ids, and the
   * list would show dates with no titles.
   */
  const foglalasok = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: kundeId } },
    sort: '-bookedAt', limit: 500, depth: 2,
  })

  const most = Date.now()
  const jovobeli: KundeOra[] = []
  const korabbi: KundeOra[] = []
  for (const b of foglalasok.docs as any[]) {
    const sor = oraSor(b)
    if (!sor) continue
    // A cancelled booking is not future attendance: the person is not
    // coming. In the past it stays, because it is part of the record.
    const jovo = new Date(sor.kezdet).getTime() > most
    if (jovo && sor.allapot === 'cancelled') continue
    ;(jovo ? jovobeli : korabbi).push(sor)
  }
  jovobeli.sort((a, b) => a.kezdet.localeCompare(b.kezdet))
  korabbi.sort((a, b) => b.kezdet.localeCompare(a.kezdet))

  const eloAbok = (abok.docs as any[]).filter((a) => a.status === 'active')

  return {
    kunde,
    youngMember: isYoungMember(kunde.birthYear),
    abok: abok.docs as any[],
    kreditOsszesen: eloAbok.reduce((ossz, a) => ossz + (a.creditsRemaining ?? 0), 0),
    jovobeli,
    korabbi,
    megbizhatosag: await getReliability(payload, kundeId),
  }
}

export type KundeSor = {
  id: number
  nev: string
  email: string
  telefon?: string
  /** Whether a health note exists — its content is not shown in the list. */
  egeszseg: boolean
  youngMember: boolean
  mattenKunde: boolean
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
export const kundeLista = async (
  payload: Payload,
  kereses?: string,
): Promise<KundeSor[]> => {
  const and: any[] = [{ role: { equals: 'customer' } }]
  const q = kereses?.trim()
  if (q) and.push({ or: [{ fullName: { like: q } }, { email: { like: q } }] })

  const r = await payload.find({
    collection: 'users',
    where: { and },
    sort: 'fullName', limit: 500, depth: 0,
  })

  return (r.docs as any[]).map((u) => ({
    id: u.id,
    nev: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
    email: u.email,
    telefon: u.phone || undefined,
    egeszseg: Boolean(u.healthNotes),
    youngMember: isYoungMember(u.birthYear),
    mattenKunde: Boolean(u.isMatCustomer),
  }))
}

export { idOf }
