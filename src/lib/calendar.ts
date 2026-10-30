import { zoneToUtc } from './series'

/**
 * Calendar arithmetic, in Swiss local time.
 *
 * The whole system thinks in `Europe/Zurich` (see `format.ts` and
 * `series.ts`), and the calendar is no exception: a day starting at
 * 00:00 is 22:00 or 23:00 the previous day in UTC, depending on
 * daylight saving. Get this wrong and the Monday morning class slides
 * into the Sunday column.
 *
 * Days are handled as `'YYYY-MM-DD'` strings, because those compare and
 * sort cleanly and carry no timezone trap. They are turned into real
 * instants only at the boundaries of a query.
 */

export type CalendarView = 'tag' | 'woche' | 'monat'

export const CALENDAR_VIEWS: CalendarView[] = ['tag', 'woche', 'monat']

export const calendarView = (value: unknown): CalendarView =>
  CALENDAR_VIEWS.includes(value as CalendarView) ? (value as CalendarView) : 'woche'

const ZONE = 'Europe/Zurich'

/** The Swiss calendar day of an instant, as `'YYYY-MM-DD'`. */
export const dayKey = (when: Date | string): string => {
  const d = typeof when === 'string' ? new Date(when) : when
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** Today, in Swiss time. */
export const today = (now: Date = new Date()): string => dayKey(now)

/** `'YYYY-MM-DD'` → a triple of numbers. */
const parts = (day: string): [number, number, number] => {
  const [y, m, d] = day.split('-').map(Number)
  return [y, m, d]
}

/** Whether the day key is valid; bad input falls back to today. */
export const dayKeyOrToday = (value: unknown, now: Date = new Date()): string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today(now)
  const [y, m, d] = parts(value)
  if (m < 1 || m > 12 || d < 1 || d > 31) return today(now)
  // Is it a real date (30 February is not)
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return today(now)
  return value
}

/** Shifts a day by calendar days, independently of timezone. */
export const addDays = (day: string, howMany: number): string => {
  const [y, m, d] = parts(day)
  const u = new Date(Date.UTC(y, m - 1, d))
  u.setUTCDate(u.getUTCDate() + howMany)
  return u.toISOString().slice(0, 10)
}

/** Day of week: 0 = Monday … 6 = Sunday. In Switzerland the week starts on Monday. */
export const dayOfWeek = (day: string): number => {
  const [y, m, d] = parts(day)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** The Monday of the week this day falls in. */
export const weekStart = (day: string): string => addDays(day, -dayOfWeek(day))

/** The first day of the month this day falls in. */
export const monthStart = (day: string): string => {
  const [y, m] = parts(day)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** How many days this month has. */
export const monthLength = (day: string): number => {
  const [y, m] = parts(day)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * The list of days the current view shows.
 *
 * The month view returns whole weeks (Monday to Sunday) so the grid is
 * never ragged — days outside the month are included, and the rendering
 * dims them.
 */
export const calendarDays = (view: CalendarView, anchor: string): string[] => {
  if (view === 'tag') return [anchor]
  if (view === 'woche') {
    const first = weekStart(anchor)
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
  }
  const firstDay = monthStart(anchor)
  const gridStart = weekStart(firstDay)
  const lastDay = addDays(firstDay, monthLength(anchor) - 1)
  const gridEnd = addDays(weekStart(lastDay), 6)
  const out: string[] = []
  for (let n = gridStart; n <= gridEnd; n = addDays(n, 1)) out.push(n)
  return out
}

/**
 * The time bounds of the query: from 00:00 on the view's first day to
 * 00:00 on the day after its last, in Swiss local time.
 */
export const calendarBounds = (
  view: CalendarView,
  anchor: string,
): { from: string; to: string } => {
  const days = calendarDays(view, anchor)
  const first = days[0]
  const nextAfter = addDays(days[days.length - 1], 1)
  const [y1, m1, d1] = parts(first)
  const [y2, m2, d2] = parts(nextAfter)
  return {
    from: zoneToUtc(y1, m1, d1, 0, 0).toISOString(),
    to: zoneToUtc(y2, m2, d2, 0, 0).toISOString(),
  }
}

/** Pages forward or back by the view's own unit. */
export const calendarStep = (view: CalendarView, anchor: string, direction: 1 | -1): string => {
  if (view === 'tag') return addDays(anchor, direction)
  if (view === 'woche') return addDays(anchor, 7 * direction)
  const [y, m] = parts(monthStart(anchor))
  const u = new Date(Date.UTC(y, m - 1 + direction, 1))
  return u.toISOString().slice(0, 10)
}

/** Whether the day falls inside the month — for dimming the month grid. */
export const sameMonth = (day: string, anchor: string): boolean =>
  day.slice(0, 7) === anchor.slice(0, 7)

/**
 * The query bounds, including the date strip.
 *
 * The strip always shows the week of the selected day, and marks under
 * each day whether there are classes on it. In day view, though, the
 * displayed period is a single day — query only that and the strip
 * would not know which days have classes, and every marker would
 * disappear.
 *
 * So the query covers the union of the view's period AND the strip's
 * week.
 */
export const calendarQuery = (
  view: CalendarView,
  anchor: string,
): { from: string; to: string } => {
  const bounds = calendarBounds(view, anchor)
  const strip = calendarBounds('woche', anchor)
  return {
    from: bounds.from < strip.from ? bounds.from : strip.from,
    to: bounds.to > strip.to ? bounds.to : strip.to,
  }
}
