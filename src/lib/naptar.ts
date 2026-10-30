import { zoneToUtc } from './series'

/**
 * Naptár-számítások, svájci helyi idő szerint.
 *
 * A rendszer mindenhol `Europe/Zurich` zónában gondolkodik (lásd
 * `format.ts` és `series.ts`), és a naptár sem lehet kivétel: egy
 * 00:00-kor kezdődő nap UTC-ben az előző nap 22:00 vagy 23:00, attól
 * függően, hogy nyári időszámítás van-e. Ha ezt elrontjuk, a hétfő
 * reggeli óra a vasárnapi oszlopba csúszik.
 *
 * A napokat `'ÉÉÉÉ-HH-NN'` alakú szövegként kezeljük, mert az
 * összehasonlítható, rendezhető, és nincs benne időzóna-csapda. Valódi
 * időpillanattá csak a lekérdezés határainál alakítjuk.
 */

export type NaptarMod = 'nap' | 'het' | 'honap'

export const NAPTAR_MODOK: NaptarMod[] = ['nap', 'het', 'honap']

export const naptarMod = (ertek: unknown): NaptarMod =>
  NAPTAR_MODOK.includes(ertek as NaptarMod) ? (ertek as NaptarMod) : 'het'

const ZONA = 'Europe/Zurich'

/** Egy pillanat svájci naptári napja, `'ÉÉÉÉ-HH-NN'` alakban. */
export const napKulcs = (mikor: Date | string): string => {
  const d = typeof mikor === 'string' ? new Date(mikor) : mikor
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** A mai nap svájci idő szerint. */
export const ma = (most: Date = new Date()): string => napKulcs(most)

/** `'ÉÉÉÉ-HH-NN'` → számhármas. */
const reszek = (nap: string): [number, number, number] => {
  const [y, m, d] = nap.split('-').map(Number)
  return [y, m, d]
}

/** Érvényes-e a napkulcs; hibás bemenetre a mai napra esünk vissza. */
export const napKulcsVagyMa = (ertek: unknown, most: Date = new Date()): string => {
  if (typeof ertek !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ertek)) return ma(most)
  const [y, m, d] = reszek(ertek)
  if (m < 1 || m > 12 || d < 1 || d > 31) return ma(most)
  // Valódi dátum-e (február 30. nem az)
  const ellenor = new Date(Date.UTC(y, m - 1, d))
  if (ellenor.getUTCMonth() !== m - 1 || ellenor.getUTCDate() !== d) return ma(most)
  return ertek
}

/** Nap eltolása naptári napokkal, zónától függetlenül. */
export const napPlusz = (nap: string, mennyi: number): string => {
  const [y, m, d] = reszek(nap)
  const u = new Date(Date.UTC(y, m - 1, d))
  u.setUTCDate(u.getUTCDate() + mennyi)
  return u.toISOString().slice(0, 10)
}

/** A hét napja: 0 = hétfő … 6 = vasárnap. Svájcban a hét hétfőn kezdődik. */
export const hetNapja = (nap: string): number => {
  const [y, m, d] = reszek(nap)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/** A nap hetének hétfője. */
export const hetKezdete = (nap: string): string => napPlusz(nap, -hetNapja(nap))

/** A nap hónapjának első napja. */
export const honapKezdete = (nap: string): string => {
  const [y, m] = reszek(nap)
  return `${y}-${String(m).padStart(2, '0')}-01`
}

/** Hány napos az adott hónap. */
export const honapHossza = (nap: string): number => {
  const [y, m] = reszek(nap)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * A nézetben megjelenő napok listája.
 *
 * A havi nézet teljes heteket ad (hétfőtől vasárnapig), hogy a rács ne
 * csonkuljon — a hónapon kívüli napok is benne vannak, azokat a
 * megjelenítés halványítja.
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
 * A lekérdezés időhatárai: a nézet első napjának 00:00-jától a mögötte
 * következő nap 00:00-jáig, svájci helyi időben.
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

/** Lapozás előre vagy hátra a nézet egységével. */
export const naptarLepes = (mod: NaptarMod, horgony: string, irany: 1 | -1): string => {
  if (mod === 'nap') return napPlusz(horgony, irany)
  if (mod === 'het') return napPlusz(horgony, 7 * irany)
  const [y, m] = reszek(honapKezdete(horgony))
  const u = new Date(Date.UTC(y, m - 1 + irany, 1))
  return u.toISOString().slice(0, 10)
}

/** A hónapon belül van-e a nap — a havi rács halványításához. */
export const azonosHonap = (nap: string, horgony: string): boolean =>
  nap.slice(0, 7) === horgony.slice(0, 7)

/**
 * A lekérdezés határai, a dátumsávot is beleértve.
 *
 * A sáv mindig a kiválasztott nap hetét mutatja, és a napok alatt
 * jelzi, van-e aznap óra. Napi nézetben viszont a megjelenített
 * időszak egyetlen nap — ha csak azt kérdeznénk le, a sáv nem tudná,
 * mely napokon van óra, és minden jelzés eltűnne.
 *
 * Ezért a lekérdezés a nézet időszakának ÉS a sáv hetének az uniója.
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
