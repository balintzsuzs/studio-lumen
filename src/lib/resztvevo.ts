import 'server-only'
import type { SzotarKulcs } from './i18n'
import { isYoungMember } from './abo'

/**
 * Egy résztvevő megjelenítése az oktatói nézetben.
 *
 * Két helyen kell ugyanaz: az óra saját oldalán a jelenléti listában, és
 * a naptárban az óra alatt. Ezért van közös fájlban — különben a kettő
 * idővel szétcsúszna, és máshol mást mutatna ugyanarról az emberről.
 */

export type Ford = (k: SzotarKulcs, p?: Record<string, string | number>) => string

/**
 * Mivel vesz részt az órán: melyik abo, és mennyi maradt belőle.
 * Az oktatónak óra előtt ez a leggyakoribb kérdése, mindjárt a név után.
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
 * Tarifa-jelzések a név mellé. A Young Member a születési évből jön,
 * nem külön kapcsolóból — így nem avul el magától.
 */
export const tarifaJelzesek = (kunde: any, t: Ford): string[] => {
  const ki: string[] = []
  if (kunde?.isMatCustomer) ki.push(t('oktora.jelzes_matten'))
  if (isYoungMember(kunde?.birthYear)) ki.push(t('oktora.jelzes_young'))
  return ki
}

/** Egy résztvevő soruk a naptárban. */
export type Resztvevo = {
  id: number
  nev: string
  gep?: string
  abo?: string
  jelzesek: string[]
  egeszseg?: string
  /** Csak akkor, ha nem egyszerűen „gebucht”. */
  allapot?: string
  /** A vendég profilja. Ha nincs, a név nem hivatkozás. */
  href?: string
}
