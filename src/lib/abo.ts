import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'
import { aboOrdered, aboActivated } from './notify'

/**
 * Ordering a pass, without a payment provider.
 *
 * The modelled payment is **cash on site or bank transfer** (QR invoice,
 * 10 days). So ordering here is not paying: the customer orders, the
 * pass goes to `pending`, and the studio activates it once the money
 * arrives. `findUsableAbo` only considers `active` passes, so a
 * `pending` pass cannot be used to book.
 *
 * When Stripe is added, it only opens a third route to activation
 * (`paymentMethod: 'online'`, immediate `confirmPayment`); the model
 * stays as it is.
 */

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export type PaymentMethod = 'on_site' | 'transfer' | 'voucher' | 'online'

/** Young Member: ages 16 to 24, derived from the birth year. */
export const isYoungMember = (birthYear?: number | null, now = new Date()): boolean => {
  if (!birthYear) return false
  const age = now.getFullYear() - birthYear
  return age >= 16 && age <= 24
}

/** Whether this person qualifies for the reduced rate. */
export const qualifiesForReduced = (user: any, now = new Date()): boolean =>
  Boolean(user?.isMatCustomer) || isYoungMember(user?.birthYear, now)

/**
 * What this customer may order. The reduced rate is only shown to
 * someone who qualifies, so no order has to be turned down afterwards.
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

/** The end of validity, counted from the given moment. */
export const expiryFrom = (from: Date, validMonths: number): Date => {
  const d = new Date(from)
  // Validity under a month (Schnupper, Einzelstunde: 0.25 months) is
  // counted in days, so that stepping by months does not round it up to
  // a full month.
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
 * Placing an order. Deducts nothing and enables no booking — it only
 * records the intent and puts it on the studio's to-do list.
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

  // One open order at a time, so duplicates do not pile up.
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
      // Provisional expiry; activation recalculates it from the day of
      // payment, so that waiting does not eat into the validity.
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
 * Payment has arrived: the pass becomes active, and its validity runs
 * from this day, not from the order.
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

/** Withdrawing an order: the customer changed their mind, or never paid. */
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

/** The customer's open order, if there is one. */
export const getOpenOrder = async (payload: Payload, userId: number) => {
  const r = await payload.find({
    collection: 'abos',
    where: { and: [{ customer: { equals: userId } }, { status: { equals: 'pending' } }] },
    limit: 1, depth: 1,
  })
  return (r.docs as any[])[0] ?? null
}
