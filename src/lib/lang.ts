import 'server-only'
import { cookies } from 'next/headers'

/**
 * A látogató nyelve.
 *
 * Három forrásból jöhet, ebben a sorrendben:
 *
 *  1. a `lang` süti — ezt vagy a foglalórendszer nyelvváltója írja,
 *     vagy a middleware, amikor valaki a `/en` marketing oldalra lép;
 *  2. a bejelentkezett felhasználó `users.language` mezője — így egy
 *     új gépen is azon a nyelven indul, amit korábban választott;
 *  3. végül a német, mert a stúdió alapnyelve az.
 *
 * A marketing oldalnak két valódi útvonala van (`/` és `/en`), mert azt
 * a keresőknek is látniuk kell. A foglalórendszer ezzel szemben egyetlen
 * útvonalon fut, és a nyelvet a süti dönti el: ott a lapok mögött
 * bejelentkezés és adatbázis van, azt fölösleges megduplázni.
 */
export type Lang = 'de' | 'en'

export const NYELVEK: readonly Lang[] = ['de', 'en'] as const

export const isLang = (v: unknown): v is Lang => v === 'de' || v === 'en'

/** A süti élettartama: egy év, hogy ne kelljen minden látogatáskor újra választani. */
export const LANG_SUTI = {
  nev: 'lang',
  beallitas: {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax' as const,
  },
}

/**
 * A bejelentkezett felhasználó, ahogy a `getCurrentUser()` adja.
 * A Payload típusa itt tág, ezért a `language` mezőt óvatosan olvassuk.
 */
type NyelvesFelhasznalo = Record<string, unknown> | null | undefined

export async function getLang(user?: NyelvesFelhasznalo): Promise<Lang> {
  const sutik = await cookies()
  const sutiNyelv = sutik.get(LANG_SUTI.nev)?.value
  if (isLang(sutiNyelv)) return sutiNyelv

  const sajat = user?.language
  if (isLang(sajat)) return sajat

  return 'de'
}

/** A másik nyelv — a nyelvváltó ide visz. */
export const masikNyelv = (lang: Lang): Lang => (lang === 'de' ? 'en' : 'de')
