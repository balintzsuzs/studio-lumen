import 'server-only'
import { cookies } from 'next/headers'

/**
 * The visitor's language.
 *
 * It can come from three sources, in this order:
 *
 *  1. the `lang` cookie — written either by the booking system's
 *     language switch, or by the middleware when someone lands on the
 *     `/en` marketing page;
 *  2. the signed-in user's `users.language` field — so that on a new
 *     machine they start in the language they picked before;
 *  3. German, because that is the studio's default language.
 *
 * The marketing site has two real routes (`/` and `/en`), because
 * search engines need to see them. The booking system, by contrast,
 * runs on a single route and lets the cookie decide: behind those
 * pages sit a login and a database, and duplicating that is pointless.
 */
export type Lang = 'de' | 'en'

export const NYELVEK: readonly Lang[] = ['de', 'en'] as const

export const isLang = (v: unknown): v is Lang => v === 'de' || v === 'en'

/** Cookie lifetime: one year, so nobody has to choose again on every visit. */
export const LANG_SUTI = {
  nev: 'lang',
  beallitas: {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax' as const,
  },
}

/**
 * The signed-in user, as `getCurrentUser()` returns it.
 * Payload's type is wide here, so the `language` field is read
 * defensively.
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

/** The other language — where the switch leads. */
export const masikNyelv = (lang: Lang): Lang => (lang === 'de' ? 'en' : 'de')
