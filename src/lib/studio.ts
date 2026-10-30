import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'
import { sessionCancelled } from './notify'

/**
 * Cancellation from the studio's side.
 *
 * Under the studio's terms, Studio Lumen may cancel a class for
 * illness, holiday, organisational reasons or **too few participants**
 * (a minimum of 2), and in that case the class is credited back to the
 * customer's account — the credit always returns, regardless of the
 * 24-hour rule. There is no refund in money.
 */

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export type StudioCancelResult = {
  ok: boolean
  cancelled: number
  refunded: number
  notified: number
  reason?: HibaKulcs
}

/**
 * Cancelling one class as the studio: every active booking is
 * cancelled, the credit written back, and everyone affected notified.
 * Re-runnable: it does nothing on an already cancelled class.
 */
export const cancelSessionByStudio = async (
  payload: Payload,
  sessionId: number,
  reason: string,
): Promise<StudioCancelResult> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, cancelled: 0, refunded: 0, notified: 0, reason: 'hiba.ora_nem_talalhato' }
  }

  const bookings = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }] },
    limit: 200, depth: 0,
  })

  let refunded = 0
  const tx = await payload.db.beginTransaction?.()
  const req = tx ? ({ transactionID: tx } as any) : undefined
  try {
    for (const b of bookings.docs as any[]) {
      const aboId = idOf(b.abo)
      try {
        const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 0 })
        await payload.update({
          collection: 'abos', id: aboId,
          data: { creditsRemaining: abo.creditsRemaining + 1 },
          req,
        })
        refunded++
      } catch {
        // If the pass has vanished meanwhile, the booking still has to be cancelled.
      }
      await payload.update({
        collection: 'bookings', id: b.id,
        data: {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          creditRefunded: true,
          cancellationType: 'by_studio',
        },
        req,
      })
    }

    if (session.status !== 'cancelled') {
      await payload.update({
        collection: 'sessions', id: sessionId,
        data: { status: 'cancelled', cancellationReason: reason },
        context: { skipSeriesPropagation: true, skipChangeNotice: true },
        req,
      })
    }

    // There is nothing left to offer the people on the waitlist either.
    const waiting = await payload.find({
      collection: 'waitlist-entries',
      where: { and: [{ session: { equals: sessionId } }, { status: { in: ['waiting', 'offered'] } }] },
      limit: 200, depth: 0,
    })
    for (const w of waiting.docs as any[]) {
      await payload.update({
        collection: 'waitlist-entries', id: w.id, data: { status: 'withdrawn' }, req,
      })
    }

    if (tx) await payload.db.commitTransaction?.(tx)
  } catch (e) {
    if (tx) await payload.db.rollbackTransaction?.(tx)
    return {
      ok: false, cancelled: 0, refunded: 0, notified: 0,
      reason: 'hiba.lemondas_mentes',
    }
  }

  // Notifications go out after the transaction, so we never send mail
  // about a change that did not end up being saved.
  const { notified } = await sessionCancelled(payload, sessionId, reason, true)

  return { ok: true, cancelled: bookings.docs.length, refunded, notified }
}

/**
 * The minimum number of participants was not reached. The studio's
 * terms require 2; the threshold is a parameter so the owner can make
 * an exception.
 */
export const cancelForTooFewParticipants = async (
  payload: Payload,
  sessionId: number,
  minimum = 2,
): Promise<StudioCancelResult & { participants?: number }> => {
  const booked = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }] },
    limit: 0, depth: 0,
  })
  if (booked.totalDocs >= minimum)
    return {
      ok: false, cancelled: 0, refunded: 0, notified: 0,
      participants: booked.totalDocs,
      reason: 'hiba.eleg_jelentkezo',
    }

  const r = await cancelSessionByStudio(
    payload, sessionId,
    `Zu wenige Anmeldungen (Minimum ${minimum} Teilnehmerinnen).`,
  )
  return { ...r, participants: booked.totalDocs }
}
