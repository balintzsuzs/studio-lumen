import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'
import { aboOrdered, aboActivated } from './notify'

/**
 * Abo-megrendelés fizetési szolgáltató nélkül.
 *
 * Az AGB szerint a fizetés ma **helyszíni készpénz vagy banki átutalás**
 * (QR-számla, 10 nap) — a kártya és a TWINT új csatorna lenne, és az AGB-t
 * is módosítani kell, mielőtt élesedhet. Ezért a megrendelés itt nem
 * fizetés: az ügyfél rendel, az abo `pending` állapotba kerül, és Nadine
 * a fizetés beérkezése után aktiválja. A `findUsableAbo` csak `active`
 * abo-t vesz figyelembe, tehát `pending` abo-val nem lehet foglalni.
 *
 * Amikor a Stripe bekerül, csak egy harmadik út nyílik az aktiváláshoz
 * (`paymentMethod: 'online'`, azonnali `confirmPayment`), a modell marad.
 */

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export type PaymentMethod = 'on_site' | 'transfer' | 'voucher' | 'online'

/** Young Member: 16-24 év. A születési évből számolva. */
export const isYoungMember = (birthYear?: number | null, now = new Date()): boolean => {
  if (!birthYear) return false
  const age = now.getFullYear() - birthYear
  return age >= 16 && age <= 24
}

/** Jogosult-e a kedvezményes tarifára. */
export const qualifiesForReduced = (user: any, now = new Date()): boolean =>
  Boolean(user?.isMatCustomer) || isYoungMember(user?.birthYear, now)

/**
 * Amit az ügyfél megrendelhet. A kedvezményes tarifa csak annak látszik,
 * aki jogosult rá — így nem kell utólag visszautasítani a rendelést.
 */
export const listPurchasable = async (payload: Payload, user: any | null) => {
  const types = await payload.find({
    collection: 'abo-types',
    where: { active: { equals: true } },
    sort: 'sortOrder', limit: 50, depth: 0,
  })
  const reduced = qualifiesForReduced(user)
  return (types.docs as any[]).filter((t) => t.tier === 'standard' || reduced)
}

/** Az érvényesség vége a megadott pillanattól számítva. */
export const expiryFrom = (from: Date, validMonths: number): Date => {
  const d = new Date(from)
  // Hét alatti érvényességet (Schnupper, Einzelstunde: 0.25 hónap) napokban
  // számolunk, hogy a hónapléptetés ne kerekítsen fel egy teljes hónapra.
  if (validMonths < 1) {
    d.setDate(d.getDate() + Math.round(validMonths * 30))
    return d
  }
  d.setMonth(d.getMonth() + validMonths)
  return d
}

export type OrderResult =
  | { ok: true; aboId: number; priceChf: number; method: PaymentMethod }
  | { ok: false; reason: HibaKulcs }

/**
 * Megrendelés. Nem von le semmit és nem engedélyez foglalást — csak
 * rögzíti a szándékot, és Nadine teendőjévé teszi.
 */
export const orderAbo = async (
  payload: Payload,
  userId: number,
  aboTypeId: number,
  method: PaymentMethod = 'on_site',
  note?: string,
): Promise<OrderResult> => {
  let user: any = null
  let type: any = null
  try {
    user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
    type = await payload.findByID({ collection: 'abo-types', id: aboTypeId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.abotipus_nincs' }
  }
  if (!type.active) return { ok: false, reason: 'hiba.abo_nem_kaphato' }
  if (type.tier === 'reduced' && !qualifiesForReduced(user))
    return {
      ok: false,
      reason: 'hiba.csak_kedvezmenyes',
    }
  if (type.voucherOnly && method !== 'voucher')
    return { ok: false, reason: 'hiba.abo_csak_utalvany' }

  // Egyszerre egy nyitott megrendelés, hogy ne gyűljenek a duplikátumok.
  const open = await payload.find({
    collection: 'abos',
    where: { and: [{ customer: { equals: userId } }, { status: { equals: 'pending' } }] },
    limit: 1, depth: 0,
  })
  if (open.totalDocs > 0)
    return {
      ok: false,
      reason: 'hiba.mar_van_nyitott_rendeles',
    }

  const now = new Date()
  const abo = await payload.create({
    collection: 'abos',
    data: {
      customer: userId,
      aboType: aboTypeId,
      creditsRemaining: type.credits,
      purchasedAt: now.toISOString(),
      // Előzetes lejárat; az aktiválás újraszámolja a fizetés napjától,
      // hogy a várakozás ne fogyassza az érvényességet.
      expiresAt: expiryFrom(now, type.validMonths).toISOString(),
      orderedAt: now.toISOString(),
      status: 'pending',
      paymentMethod: method,
      note: note ?? null,
    },
  })

  await aboOrdered(payload, userId, abo.id as number)

  return { ok: true, aboId: abo.id as number, priceChf: type.priceChf, method }
}

/**
 * A fizetés beérkezett: az abo aktív lesz, és az érvényesség ettől a
 * naptól indul, nem a megrendeléstől.
 */
export const confirmPayment = async (
  payload: Payload,
  aboId: number,
  paidAt = new Date(),
): Promise<{ ok: boolean; reason?: HibaKulcs; expiresAt?: string }> => {
  let abo: any = null
  try {
    abo = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.abo_nincs' }
  }
  if (abo.status !== 'pending')
    return { ok: false, reason: 'hiba.rendeles_nem_nyitott' }

  const type: any = await payload.findByID({
    collection: 'abo-types', id: idOf(abo.aboType), depth: 0,
  })
  const expiresAt = expiryFrom(paidAt, type.validMonths).toISOString()

  await payload.update({
    collection: 'abos', id: aboId,
    data: {
      status: 'active',
      paidAt: paidAt.toISOString(),
      purchasedAt: paidAt.toISOString(),
      expiresAt,
      creditsRemaining: type.credits,
    },
  })
  await aboActivated(payload, idOf(abo.customer), aboId)

  return { ok: true, expiresAt }
}

/** Megrendelés visszavonása: az ügyfél meggondolta magát, vagy nem fizetett. */
export const cancelOrder = async (
  payload: Payload,
  aboId: number,
  byUserId?: number,
): Promise<{ ok: boolean; reason?: HibaKulcs }> => {
  let abo: any = null
  try {
    abo = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.abo_nincs' }
  }
  if (byUserId !== undefined && idOf(abo.customer) !== byUserId)
    return { ok: false, reason: 'hiba.nem_a_te_rendelesed' }
  if (abo.status !== 'pending')
    return { ok: false, reason: 'hiba.csak_nyitott_vonhato_vissza' }

  await payload.update({ collection: 'abos', id: aboId, data: { status: 'cancelled' } })
  return { ok: true }
}

/** Az ügyfél nyitott megrendelése, ha van. */
export const getOpenOrder = async (payload: Payload, userId: number) => {
  const r = await payload.find({
    collection: 'abos',
    where: { and: [{ customer: { equals: userId } }, { status: { equals: 'pending' } }] },
    limit: 1, depth: 1,
  })
  return (r.docs as any[])[0] ?? null
}
