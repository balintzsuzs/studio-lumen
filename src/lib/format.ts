import type { Lang } from './lang'

/**
 * Date formatting to Swiss convention, in German and English.
 *
 * Always in `Europe/Zurich`, never in the server's local time: Vercel
 * runs in UTC, where a 07:00 class would show up as 06.00.
 *
 * The language can be omitted everywhere and then defaults to German —
 * so a caller that is not language-dependent (a log, say) can be used
 * unchanged.
 */
const ZONE = 'Europe/Zurich'

const WEEKDAYS: Record<Lang, string[]> = {
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

const MONTHS: Record<Lang, string[]> = {
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}

/** Year, month, day, hour, minute and weekday in Swiss local time. */
const parts = (iso: string) => {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(new Date(iso))) p[part.type] = part.value
  const weekdayIndex = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour) % 24, minute: Number(p.minute), weekdayIndex,
  }
}

/** "Donnerstag, 5. Juni" / "Thursday, 5 June" */
export const dayLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const nap = WEEKDAYS[lang][p.weekdayIndex]
  const honap = MONTHS[lang][p.month - 1]
  return lang === 'de' ? `${nap}, ${p.day}. ${honap}` : `${nap}, ${p.day} ${honap}`
}

/**
 * Hours and minutes. German uses a dot (07.30), English a colon
 * (07:30) — that is written convention in each language, and the
 * studio's printed schedule looks the same way.
 */
export const timeLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const elvalaszto = lang === 'de' ? '.' : ':'
  return `${String(p.hour).padStart(2, '0')}${elvalaszto}${String(p.minute).padStart(2, '0')}`
}

/** A full timestamp on one line, for notification emails. */
export const dateTimeLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const datum = dayLabel(iso, lang)
  return lang === 'de'
    ? `${datum} ${p.year}, ${timeLabel(iso, lang)} Uhr`
    : `${datum} ${p.year}, ${timeLabel(iso, lang)}`
}

/** Numeric date, to local convention: 05.06.2026 / 05/06/2026. */
export const shortDateLabel = (iso: string, lang: Lang = 'de') =>
  new Date(iso).toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB')

/** Calendar day in Swiss time, for grouping. */
export const dayKey = (iso: string) => {
  const p = parts(iso)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export const isToday = (iso: string) => dayKey(iso) === dayKey(new Date().toISOString())

/**
 * The language of a class: a setting on the class itself wins, else the
 * instructor's. That way changing an instructor's languages carries to
 * all their classes, while individual exceptions remain possible.
 */
export const sessionLanguages = (session: any): string[] => {
  const own = session?.languages
  if (Array.isArray(own) && own.length) return own
  const instructor = session?.instructor
  const theirs = typeof instructor === 'object' && instructor ? instructor.teachingLanguages : null
  return Array.isArray(theirs) ? theirs : []
}

/** Short label for the schedule: "DE", "EN" or "DE/EN". */
export const languageLabel = (session: any): string =>
  sessionLanguages(session)
    .map((l) => l.toUpperCase())
    .join('/')

/** Short weekday name for a calendar day (`'YYYY-MM-DD'`). */
export const napNeveRovid = (nap: string, lang: Lang = 'de'): string => {
  const [y, m, d] = nap.split('-').map(Number)
  const index = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return WEEKDAYS[lang][index].slice(0, lang === 'de' ? 2 : 3)
}

/** Full weekday name for a calendar day. */
export const napNeve = (nap: string, lang: Lang = 'de'): string => {
  const [y, m, d] = nap.split('-').map(Number)
  return WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** "29. Oktober" / "29 October" for a calendar day. */
export const napEsHonap = (nap: string, lang: Lang = 'de'): string => {
  const [, m, d] = nap.split('-').map(Number)
  return lang === 'de' ? `${d}. ${MONTHS.de[m - 1]}` : `${d} ${MONTHS.en[m - 1]}`
}

/** "Oktober 2026" — for the calendar header. */
export const honapEsEv = (nap: string, lang: Lang = 'de'): string => {
  const [y, m] = nap.split('-').map(Number)
  return `${MONTHS[lang][m - 1]} ${y}`
}
