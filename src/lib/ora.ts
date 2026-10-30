import 'server-only'
import type { Payload } from 'payload'
import type { HibaKulcs } from './i18n'
import { zoneToUtc } from './series'

/**
 * Creating and deleting a single class from the studio side.
 *
 * Recurring classes come from series (`session-series`); this is for
 * one-offs: a make-up class, a workshop, a new slot for a class that
 * fell through. The owner needs to be able to do this without the
 * Payload admin, because there she is shown eight fields, and three of
 * them do not explain themselves.
 */

export type UjOra = {
  /** 'YYYY-MM-DD', Swiss calendar day. */
  nap: string
  /** 'HH:MM', Swiss local time. */
  ido: string
  classTypeId: number
  studioId: number
  instructorId: number
  perc: number
  /** Left empty: the instructor's own languages apply. */
  nyelvek?: ('de' | 'en')[]
  megjegyzes?: string
}

const NAP = /^\d{4}-\d{2}-\d{2}$/
const IDO = /^([01]\d|2[0-3]):[0-5]\d$/

export const createSession = async (
  payload: Payload,
  ora: UjOra,
  now = new Date(),
): Promise<{ ok: true; sessionId: number } | { ok: false; reason: HibaKulcs }> => {
  if (!NAP.test(ora.nap) || !IDO.test(ora.ido)) return { ok: false, reason: 'hiba.ora_ervenytelen_idopont' }
  if (!(ora.perc > 0) || ora.perc > 300) return { ok: false, reason: 'hiba.ora_ervenytelen_hossz' }

  const [y, m, d] = ora.nap.split('-').map(Number)
  const [hh, mm] = ora.ido.split(':').map(Number)
  // Entered in Swiss local time, stored in UTC — the same rule as for
  // series, otherwise it would slip by an hour across the daylight
  // saving boundary.
  const kezdet = zoneToUtc(y, m, d, hh, mm)

  // A class created in the past helps nobody: it cannot be booked, and
  // closing would immediately mark everyone present — including people
  // who were never there.
  if (kezdet <= now) return { ok: false, reason: 'hiba.ora_a_multban' }

  // The instructor must actually be one, and the studio and type must exist.
  const [oktato, studio, tipus] = await Promise.all([
    payload.findByID({ collection: 'users', id: ora.instructorId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'studios', id: ora.studioId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'class-types', id: ora.classTypeId, depth: 0 }).catch(() => null),
  ])
  if (!studio || !tipus) return { ok: false, reason: 'hiba.ora_hianyzo_adat' }
  if (!oktato || ((oktato as any).role !== 'instructor' && (oktato as any).role !== 'admin'))
    return { ok: false, reason: 'hiba.ora_nem_oktato' }

  /*
   * Clash: the same instructor, in the same minute. The bottleneck is
   * not the room (there are two studios), it is the person. Without
   * this check a mistyped date would put two classes at the same time,
   * and only the customers would notice.
   */
  const utkozes = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { instructor: { equals: ora.instructorId } },
        { startsAt: { equals: kezdet.toISOString() } },
        { status: { equals: 'scheduled' } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (utkozes.totalDocs > 0) return { ok: false, reason: 'hiba.ora_utkozik' }

  const created = await payload.create({
    collection: 'sessions',
    data: {
      classType: ora.classTypeId,
      studio: ora.studioId,
      instructor: ora.instructorId,
      startsAt: kezdet.toISOString(),
      durationMinutes: ora.perc,
      status: 'scheduled',
      ...(ora.nyelvek?.length ? { languages: ora.nyelvek } : {}),
      ...(ora.megjegyzes ? { note: ora.megjegyzes } : {}),
    },
  })
  return { ok: true, sessionId: (created as any).id }
}

/**
 * Deleting a class.
 *
 * Only when nobody is on it. Where there are participants, deletion is
 * the wrong tool: a class people had signed up for would vanish without
 * a trace, their credits would not come back, and they would get no
 * notification. Cancellation (`cancelSessionByStudio`) is for that — it
 * refunds and notifies everyone, and the class stays on record.
 *
 * A cancelled, empty class can be tidied away: it belongs to nobody.
 */
export const deleteSession = async (
  payload: Payload,
  sessionId: number,
): Promise<{ ok: true } | { ok: false; reason: HibaKulcs }> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.ora_nem_talalhato' }
  }
  if (!session) return { ok: false, reason: 'hiba.ora_nem_talalhato' }

  const elo = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { session: { equals: sessionId } },
        { status: { in: ['booked', 'attended', 'no_show'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (elo.totalDocs > 0) return { ok: false, reason: 'hiba.ora_van_jelentkezo' }

  // Cancelled bookings and waitlist entries can go with it: on their
  // own they mean nothing.
  const maradek = await payload.find({
    collection: 'bookings',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const b of maradek.docs as any[]) {
    await payload.delete({ collection: 'bookings', id: b.id })
  }
  const varok = await payload.find({
    collection: 'waitlist-entries',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const w of varok.docs as any[]) {
    await payload.delete({ collection: 'waitlist-entries', id: w.id })
  }

  await payload.delete({ collection: 'sessions', id: sessionId })
  return { ok: true }
}
