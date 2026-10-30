import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'

/**
 * Attendance: a late cancellation and a no-show are two separate facts.
 *
 *  - late cancellation: the customer did tell us, but inside the 24-hour
 *    window (`cancellationType = 'late'`, the credit is forfeited)
 *  - no-show: never told us and never turned up (`status = 'no_show'`)
 *
 * A no-show is recorded after the class. See `closeSession` below for
 * which way round the marking works, and why.
 */

export type Attendance = 'attended' | 'no_show'

export const markAttendance = async (
  payload: Payload,
  bookingId: number,
  attendance: Attendance,
): Promise<{ ok: boolean; reason?: HibaKulcs }> => {
  let booking: any = null
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1 })
  } catch {
    return { ok: false, reason: 'hiba.buchung_nincs' }
  }
  if (booking.status === 'cancelled')
    return { ok: false, reason: 'hiba.sztornozott_nem_jelenlet' }

  await payload.update({
    collection: 'bookings',
    id: bookingId,
    data: { status: attendance, attendanceMarkedAt: new Date().toISOString() },
  })
  return { ok: true }
}

/**
 * Closing a class: every still-open booking is set to ATTENDED.
 *
 * This is one of the most important working rules in the system, so it
 * gets a paragraph. It used to work the other way round: closing marked
 * everyone as a no-show, and the instructor had to correct each person
 * who had actually been there. But the normal case is that someone who
 * booked turns up — out of five spots, one goes empty maybe once a
 * month. So the instructor was making five clicks to record nothing.
 *
 * From here on the instructor's only job is to mark who was ABSENT.
 * Anyone not marked was there. That is less work and fewer mistakes:
 * a forgotten click no longer brands someone with an undeserved
 * no-show.
 *
 * Only runs on a class that has already started. Re-runnable: it does
 * not overwrite attendance that was already recorded (`attended` or
 * `no_show`).
 */
export const closeSession = async (
  payload: Payload,
  sessionId: number,
): Promise<{ ok: boolean; marked: number; reason?: HibaKulcs }> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, marked: 0, reason: 'hiba.ora_nem_talalhato' }
  }
  if (new Date(session.startsAt) > new Date())
    return { ok: false, marked: 0, reason: 'hiba.ora_meg_nem_kezdodott' }

  const open = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }] },
    limit: 200, depth: 0,
  })
  const now = new Date().toISOString()
  for (const b of open.docs as any[]) {
    await payload.update({
      collection: 'bookings', id: b.id,
      data: { status: 'attended', attendanceMarkedAt: now },
    })
  }
  return { ok: true, marked: open.docs.length }
}

/**
 * How long a finished class waits before closing itself.
 *
 * The instructor needs a window in which to mark who was missing. Close
 * it immediately after the class and the absentees would stay recorded
 * as present; never close it and profiles would read "gebucht" forever.
 * By the next morning it should be settled either way.
 */
export const AUTO_CLOSE_HOURS = 12

/**
 * Closes classes that finished long ago and are still open.
 *
 * Needed because an instructor will not remember to close a class where
 * nothing out of the ordinary happened — and should not have to. If
 * nobody touched it, that means everybody was there.
 */
export const closeStaleSessions = async (
  payload: Payload,
  now = new Date(),
  limit = 50,
): Promise<{ sessions: number; marked: number }> => {
  const hatar = new Date(now.getTime() - AUTO_CLOSE_HOURS * 36e5).toISOString()
  const regi = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { startsAt: { less_than: hatar } },
        { status: { equals: 'scheduled' } },
      ],
    },
    sort: '-startsAt', limit, depth: 0,
  })

  let sessions = 0
  let marked = 0
  for (const s of regi.docs as any[]) {
    const r = await closeSession(payload, s.id)
    if (r.ok && r.marked > 0) {
      sessions++
      marked += r.marked
    }
  }
  return { sessions, marked }
}

export type Reliability = {
  attended: number
  noShows: number
  lateCancels: number
  inTimeCancels: number
}

/** A customer's attendance record, optionally only since a given date. */
export const getReliability = async (
  payload: Payload,
  userId: number,
  since?: Date,
): Promise<Reliability> => {
  const base: any[] = [{ customer: { equals: userId } }]
  if (since) base.push({ bookedAt: { greater_than: since.toISOString() } })

  const count = async (extra: any) =>
    (await payload.find({
      collection: 'bookings',
      where: { and: [...base, extra] },
      limit: 0, depth: 0,
    })).totalDocs

  return {
    attended: await count({ status: { equals: 'attended' } }),
    noShows: await count({ status: { equals: 'no_show' } }),
    lateCancels: await count({ cancellationType: { equals: 'late' } }),
    inTimeCancels: await count({ cancellationType: { equals: 'in_time' } }),
  }
}
