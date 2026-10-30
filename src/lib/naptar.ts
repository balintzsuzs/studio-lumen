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

export type NaptarMod = 'nap' | 'het' | 'honap'

export const NAPTAR_MODOK: NaptarMod[] = ['nap', 'het', 'honap']

export const naptarMod = (ertek: unknown): NaptarMod =>
  NAPTAR_MODOK.includes(ertek as NaptarMod) ? (ertek as NaptarMod) : 'het'

const ZONA = 'Europe/Zurich'

/** The Swiss calendar day of an instant, as `'YYYY-MM-DD'`. */
export const napKulcs = (mikor: Date | string): string => {
  const d = typeof mikor === 'string' ? new Date(mikor) : mikor
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** Today, in Swiss time. */
export const ma = (most: Date = new Date()): string => napKulcs(most)

/** `'YYYY-MM-DD'` → a triple of numbers. */
const reszek = (nap: string): [number, number, number] => {
  const [y, m, d] = nap.split('-').map(Number)
  return [y, m, d]
}

/** Whether the day key is valid; bad input falls back to today. */
export const napKulcsVagyMa = (ertek: unknown, most: Date = new Date()): string => {
  if (typeof ertek !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ertek)) return ma(most)
  const [y, m, d] = reszek(ertek)
  if (m < 1 || m > 12 || d < 1 || d > 31) return ma(most)
  // Is it a real date (30 February is not)
  const ellenor = new Date(Date.UTC(y, m - 1, d))
  if (ellenor.getUTCMonth() !== m - 1 || ellenor.getUTCDate() !== d) return ma(most)
  return ertek
}

/** Shifts a day by calendar days, independently of timezone. */
export const napPlusz = (nap: string, mennyi: number): string => {
  const [y, m, d] = reszek(nap)
  const u = new Date(Date.UTC(y, m - 1, d))
  u.setUTCDate(u.getUTCDate() + mennyi)
  return u.toISOString().slice(0, 10)
}

/** Day of week: 0 = Monday … 6 = Sunday. In Switzerland the week starts on Monday. */
export const hetNapja = (nap: string): number => {
  const [y, m, d] = reszek(nap)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** The Monday of the week this day falls in. */
export const hetKezdete = (nap: string): string => napPlusz(nap, -hetNapja(nap))

/** The first day of the month this day falls in. */
export const honapKezdete = (nap: string): string => {
  const [y, m] = reszek(nap)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** How many days this month has. */
export const honapHossza = (nap: string): number => {
  const [y, m] = reszek(nap)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * The list of days the current view shows.
 *
 * The month view returns whole weeks (Monday to Sunday) so the grid is
 * never ragged — days outside the month are included, and the rendering
 * dims them.
 */
export const naptarNapjai = (mod: NaptarMod, horgony: string): string[] => {
  if (mod === 'nap') return [horgony]
  if (mod === 'het') {
    const elso = hetKezdete(horgony)
    return Array.from({ length: 7 }, (_, i) => napPlusz(elso, i))
  }
  const elsoNap = honapKezdete(horgony)
  const racsKezdet = hetKezdete(elsoNap)
  const utolsoNap = napPlusz(elsoNap, honapHossza(horgony) - 1)
  const racsVeg = napPlusz(hetKezdete(utolsoNap), 6)
  const ki: string[] = []
  for (let n = racsKezdet; n <= racsVeg; n = napPlusz(n, 1)) ki.push(n)
  return ki
}

/**
 * The time bounds of the query: from 00:00 on the view's first day to
 * 00:00 on the day after its last, in Swiss local time.
 */
export const naptarHatarok = (
  mod: NaptarMod,
  horgony: string,
): { tol: string; ig: string } => {
  const napok = naptarNapjai(mod, horgony)
  const elso = napok[0]
  const utanaKovetkezo = napPlusz(napok[napok.length - 1], 1)
  const [y1, m1, d1] = reszek(elso)
  const [y2, m2, d2] = reszek(utanaKovetkezo)
  return {
    tol: zoneToUtc(y1, m1, d1, 0, 0).toISOString(),
    ig: zoneToUtc(y2, m2, d2, 0, 0).toISOString(),
  }
}

/** Pages forward or back by the view's own unit. */
export const naptarLepes = (mod: NaptarMod, horgony: string, irany: 1 | -1): string => {
  if (mod === 'nap') return napPlusz(horgony, irany)
  if (mod === 'het') return napPlusz(horgony, 7 * irany)
  const [y, m] = reszek(honapKezdete(horgony))
  const u = new Date(Date.UTC(y, m - 1 + irany, 1))
  return u.toISOString().slice(0, 10)
}

/** Whether the day falls inside the month — for dimming the month grid. */
export const azonosHonap = (nap: string, horgony: string): boolean =>
  nap.slice(0, 7) === horgony.slice(0, 7)

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
export const naptarLekerdezes = (
  mod: NaptarMod,
  horgony: string,
): { tol: string; ig: string } => {
  const nezet = naptarHatarok(mod, horgony)
  const sav = naptarHatarok('het', horgony)
  return {
    tol: nezet.tol < sav.tol ? nezet.tol : sav.tol,
    ig: nezet.ig > sav.ig ? nezet.ig : sav.ig,
  }
}
