import 'server-only'
import type { SzotarKulcs } from './i18n'
import { isYoungMember } from './abo'

/**
 * Rendering one participant in the instructor's view.
 *
 * The same thing is needed in two places: in the register on the
 * class's own page, and under the class in the calendar. Hence a shared
 * file — otherwise the two would drift apart over time and show
 * different things about the same person.
 */

export type Ford = (k: SzotarKulcs, p?: Record<string, string | number>) => string

/**
 * What they are attending on: which pass, and how much is left on it.
 * Before a class this is the instructor's most frequent question, right
 * after the name.
 */
export const reszvetelSzoveg = (b: any, t: Ford): string => {
  const abo = b?.abo
  if (!abo || typeof abo !== 'object') return '—'
  const nev = abo.aboType?.name ?? t('kozos.lektion')
  const maradt = abo.creditsRemaining
  if (typeof maradt !== 'number') return nev
  return maradt === 0
    ? t('oktora.abo_utolso', { nev })
    : t('oktora.abo_maradek', { nev, db: maradt })
}

/**
 * Rate markers next to the name. Young Member comes from the birth
 * year, not from a separate flag — that way it cannot go stale on its
 * own.
 */
export const tarifaJelzesek = (kunde: any, t: Ford): string[] => {
  const ki: string[] = []
  if (kunde?.isMatCustomer) ki.push(t('oktora.jelzes_matten'))
  if (isYoungMember(kunde?.birthYear)) ki.push(t('oktora.jelzes_young'))
  return ki
}

/** One participant's row in the calendar. */
export type Resztvevo = {
  id: number
  nev: string
  gep?: string
  abo?: string
  jelzesek: string[]
  egeszseg?: string
  /** Only when it is not simply "gebucht". */
  allapot?: string
  /** The customer's profile. Without one, the name is not a link. */
  href?: string
}
