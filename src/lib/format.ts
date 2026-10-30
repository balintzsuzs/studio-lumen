import type { Lang } from './lang'

/**
 * Dátumformázás svájci szokás szerint, németül és angolul.
 *
 * Mindig `Europe/Zurich` zónában, nem a szerver helyi idejében: a Vercel
 * UTC-ben fut, ott a 07:00-as óra 06.00-ként jelenne meg.
 *
 * A nyelv mindenhol elhagyható, és akkor német — így az a hívó, amelyik
 * nem nyelvfüggő (például egy napló), változatlanul használható.
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

/** Év, hónap, nap, óra, perc és hétköznap svájci helyi időben. */
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

/** „Donnerstag, 5. Juni" / „Thursday, 5 June" */
export const dayLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const nap = WEEKDAYS[lang][p.weekdayIndex]
  const honap = MONTHS[lang][p.month - 1]
  return lang === 'de' ? `${nap}, ${p.day}. ${honap}` : `${nap}, ${p.day} ${honap}`
}

/**
 * Óra és perc. Németül ponttal (07.30), angolul kettősponttal (07:30) —
 * ez a két nyelv írott szokása, a stúdió nyomtatott órarendje is így néz ki.
 */
export const timeLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const elvalaszto = lang === 'de' ? '.' : ':'
  return `${String(p.hour).padStart(2, '0')}${elvalaszto}${String(p.minute).padStart(2, '0')}`
}

/** Teljes időpont egy sorban, értesítő levelekhez. */
export const dateTimeLabel = (iso: string, lang: Lang = 'de') => {
  const p = parts(iso)
  const datum = dayLabel(iso, lang)
  return lang === 'de'
    ? `${datum} ${p.year}, ${timeLabel(iso, lang)} Uhr`
    : `${datum} ${p.year}, ${timeLabel(iso, lang)}`
}

/** Dátum számokkal, a helyi szokás szerint: 05.06.2026 / 05/06/2026. */
export const shortDateLabel = (iso: string, lang: Lang = 'de') =>
  new Date(iso).toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB')

/** Naptári nap svájci idő szerint, csoportosításhoz. */
export const dayKey = (iso: string) => {
  const p = parts(iso)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export const isToday = (iso: string) => dayKey(iso) === dayKey(new Date().toISOString())

/**
 * Az óra nyelve: ha az órán van saját beállítás, az dönt, különben az
 * oktatóé. Így egy oktató nyelvének módosítása az összes óráján átüt,
 * de egy-egy kivétel mégis megadható.
 */
export const sessionLanguages = (session: any): string[] => {
  const own = session?.languages
  if (Array.isArray(own) && own.length) return own
  const instructor = session?.instructor
  const theirs = typeof instructor === 'object' && instructor ? instructor.teachingLanguages : null
  return Array.isArray(theirs) ? theirs : []
}

/** Rövid címke az órarendre: „DE", „EN" vagy „DE/EN". */
export const languageLabel = (session: any): string =>
  sessionLanguages(session)
    .map((l) => l.toUpperCase())
    .join('/')

/** Rövid hétköznap-név egy naptári naphoz (`'ÉÉÉÉ-HH-NN'`). */
export const napNeveRovid = (nap: string, lang: Lang = 'de'): string => {
  const [y, m, d] = nap.split('-').map(Number)
  const index = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return WEEKDAYS[lang][index].slice(0, lang === 'de' ? 2 : 3)
}

/** Teljes hétköznap-név egy naptári naphoz. */
export const napNeve = (nap: string, lang: Lang = 'de'): string => {
  const [y, m, d] = nap.split('-').map(Number)
  return WEEKDAYS[lang][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/** „29. Oktober” / „29 October” egy naptári naphoz. */
export const napEsHonap = (nap: string, lang: Lang = 'de'): string => {
  const [, m, d] = nap.split('-').map(Number)
  return lang === 'de' ? `${d}. ${MONTHS.de[m - 1]}` : `${d} ${MONTHS.en[m - 1]}`
}

/** „Oktober 2026” — a naptár fejlécébe. */
export const honapEsEv = (nap: string, lang: Lang = 'de'): string => {
  const [y, m] = nap.split('-').map(Number)
  return `${MONTHS[lang][m - 1]} ${y}`
}
