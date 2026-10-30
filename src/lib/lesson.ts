import 'server-only'
import type { Payload } from 'payload'
import type { ErrorKey } from './i18n'
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

export type NewLesson = {
  /** 'YYYY-MM-DD', Swiss calendar day. */
  day: string
  /** 'HH:MM', Swiss local time. */
  time: string
  classTypeId: number
  studioId: number
  instructorId: number
  minutes: number
  /** Left empty: the instructor's own languages apply. */
  languages?: ('de' | 'en')[]
  note?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const createSession = async (
  payload: Payload,
  lesson: NewLesson,
  now = new Date(),
): Promise<{ ok: true; sessionId: number } | { ok: false; reason: ErrorKey }> => {
  if (!DATE_RE.test(lesson.day) || !TIME_RE.test(lesson.time)) return { ok: false, reason: 'error.class_invalid_time' }
  if (!(lesson.minutes > 0) || lesson.minutes > 300) return { ok: false, reason: 'error.class_invalid_duration' }

  const [y, m, d] = lesson.day.split('-').map(Number)
  const [hh, mm] = lesson.time.split(':').map(Number)
  // Entered in Swiss local time, stored in UTC — the same rule as for
  // series, otherwise it would slip by an hour across the daylight
  // saving boundary.
  const start = zoneToUtc(y, m, d, hh, mm)

  // A class created in the past helps nobody: it cannot be booked, and
  // closing would immediately mark everyone present — including people
  // who were never there.
  if (start <= now) return { ok: false, reason: 'error.class_in_past' }

  // The instructor must actually be one, and the studio and type must exist.
  const [instructor, studio, type] = await Promise.all([
    payload.findByID({ collection: 'users', id: lesson.instructorId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'studios', id: lesson.studioId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'class-types', id: lesson.classTypeId, depth: 0 }).catch(() => null),
  ])
  if (!studio || !type) return { ok: false, reason: 'error.class_missing_data' }
  if (!instructor || ((instructor as any).role !== 'instructor' && (instructor as any).role !== 'admin'))
    return { ok: false, reason: 'error.not_an_instructor' }

  /*
   * Clash: the same instructor, in the same minute. The bottleneck is
   * not the room (there are two studios), it is the person. Without
   * this check a mistyped date would put two classes at the same time,
   * and only the customers would notice.
   */
  const conflict = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { instructor: { equals: lesson.instructorId } },
        { startsAt: { equals: start.toISOString() } },
        { status: { equals: 'scheduled' } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (conflict.totalDocs > 0) return { ok: false, reason: 'error.class_conflict' }

  const created = await payload.create({
    collection: 'sessions',
    data: {
      classType: lesson.classTypeId,
      studio: lesson.studioId,
      instructor: lesson.instructorId,
      startsAt: start.toISOString(),
      durationMinutes: lesson.minutes,
      status: 'scheduled',
      ...(lesson.languages?.length ? { languages: lesson.languages } : {}),
      ...(lesson.note ? { note: lesson.note } : {}),
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
): Promise<{ ok: true } | { ok: false; reason: ErrorKey }> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, reason: 'error.class_not_found' }
  }
  if (!session) return { ok: false, reason: 'error.class_not_found' }

  const live = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { session: { equals: sessionId } },
        { status: { in: ['booked', 'attended', 'no_show'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (live.totalDocs > 0) return { ok: false, reason: 'error.class_has_registrations' }

  // Cancelled bookings and waitlist entries can go with it: on their
  // own they mean nothing.
  const remaining = await payload.find({
    collection: 'bookings',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const b of remaining.docs as any[]) {
    await payload.delete({ collection: 'bookings', id: b.id })
  }
  const waitingEntries = await payload.find({
    collection: 'waitlist-entries',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const w of waitingEntries.docs as any[]) {
    await payload.delete({ collection: 'waitlist-entries', id: w.id })
  }

  await payload.delete({ collection: 'sessions', id: sessionId })
  return { ok: true }
}
