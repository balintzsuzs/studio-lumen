import 'server-only'
import type { Payload, PayloadRequest } from 'payload'

/**
 * Recurring classes. The series is the rule, the `sessions` records are
 * the facts.
 *
 *  - `generateSessions` creates the missing classes across the series'
 *    period
 *  - `propagateToFutureSessions` carries a change on one class to the
 *    series' other classes that are still in the future and not detached
 *
 * Times are computed from Swiss local time so they do not slip by an
 * hour at the daylight saving change ("every Monday 09:00" should stay
 * 09:00 all year).
 */

const ZONE = 'Europe/Zurich'

/** The zone's offset in minutes at a given instant. */
const zoneOffsetMinutes = (at: Date): number => {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(at)) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  )
  return (asUtc - at.getTime()) / 60000
}

/** Swiss local date and time → an instant in UTC. */
export const zoneToUtc = (y: number, m: number, d: number, hh: number, mm: number): Date => {
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  let guess = new Date(naive)
  // Two passes suffice: the first gives the offset, the second handles the DST boundary.
  for (let i = 0; i < 2; i++) guess = new Date(naive - zoneOffsetMinutes(guess) * 60000)
  return guess
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export type GenerateResult = { created: number; skipped: number }

/**
 * Creates the class on every day the series covers, where one does not
 * exist yet. Re-runnable: it leaves existing ones untouched.
 */
export const generateSessions = async (
  payload: Payload,
  seriesId: number,
): Promise<GenerateResult> => {
  const series: any = await payload.findByID({ collection: 'session-series', id: seriesId, depth: 0 })
  const weekday = Number(series.weekday)
  const [hh, mm] = String(series.timeOfDay).split(':').map(Number)

  const from = new Date(series.startsOn)
  const to = new Date(series.endsOn)

  // Classes the series has already generated, so we do not duplicate.
  const existing = await payload.find({
    collection: 'sessions',
    where: { series: { equals: seriesId } },
    limit: 1000, depth: 0,
  })
  const taken = new Set((existing.docs as any[]).map((s) => new Date(s.startsAt).getTime()))

  let created = 0
  let skipped = 0

  // We step day by day through the series' period using calendar days
  // computed in UTC, but build the time from local time.
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())

  while (cursor.getTime() <= last) {
    if (cursor.getUTCDay() === weekday) {
      const startsAt = zoneToUtc(
        cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), hh, mm,
      )
      if (taken.has(startsAt.getTime())) {
        skipped++
      } else {
        await payload.create({
          collection: 'sessions',
          data: {
            classType: idOf(series.classType),
            studio: idOf(series.studio),
            instructor: idOf(series.instructor),
            startsAt: startsAt.toISOString(),
            durationMinutes: series.durationMinutes,
            status: 'scheduled',
            series: seriesId,
            detached: false,
            editScope: 'only_this',
          },
          context: { skipSeriesPropagation: true },
        })
        created++
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return { created, skipped }
}

/**
 * Carries a change on the given class to the series' other future
 * classes.
 *
 * Fields carried over: class type, studio, instructor, duration, time
 * of day, status, note. Not the date: every class stays on its own day,
 * only its time is aligned. Detached classes are never rewritten.
 */
export const propagateToFutureSessions = async (
  payload: Payload,
  source: any,
  req?: PayloadRequest,
): Promise<{ updated: number }> => {
  const seriesId = idOf(source.series)
  const sourceStart = new Date(source.startsAt)

  const siblings = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { series: { equals: seriesId } },
        { id: { not_equals: source.id } },
        { startsAt: { greater_than: sourceStart.toISOString() } },
        { detached: { not_equals: true } },
      ],
    },
    limit: 1000, depth: 0,
  })

  // The source class's time of day in Swiss local time — the others get this.
  const local = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, hour12: false, hour: '2-digit', minute: '2-digit',
  }).format(sourceStart)
  const [hh, mm] = local.split(':').map(Number)

  let updated = 0
  for (const s of siblings.docs as any[]) {
    const day = new Date(s.startsAt)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(day).split('-').map(Number)
    const startsAt = zoneToUtc(parts[0], parts[1], parts[2], hh, mm)

    await payload.update({
      collection: 'sessions',
      id: s.id,
      data: {
        classType: idOf(source.classType),
        studio: idOf(source.studio),
        instructor: idOf(source.instructor),
        durationMinutes: source.durationMinutes,
        status: source.status,
        note: source.note ?? null,
        startsAt: startsAt.toISOString(),
      },
      context: { skipSeriesPropagation: true },
      req,
    })
    updated++
  }

  // The series rule should follow the change too, so that classes
  // generated later are not built from the old values.
  await payload.update({
    collection: 'session-series',
    id: seriesId,
    data: {
      classType: idOf(source.classType),
      studio: idOf(source.studio),
      instructor: idOf(source.instructor),
      durationMinutes: source.durationMinutes,
      timeOfDay: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    },
    context: { skipSeriesPropagation: true },
    req,
  })

  // Reset the scope on the source class, so the next save does not
  // propagate again by accident.
  await payload.update({
    collection: 'sessions',
    id: source.id,
    data: { editScope: 'only_this' },
    context: { skipSeriesPropagation: true },
    req,
  })

  return { updated }
}
