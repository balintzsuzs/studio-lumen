import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'
import { sessionCancelled } from './notify'

/**
 * Stúdió-oldali lemondás.
 *
 * Az AGB szerint a Studio Lumen lemondhat órát betegség, szabadság,
 * szervezési ok vagy **túl kevés jelentkező** miatt (minimum 2 fő), és
 * ilyenkor a lektion "dem Kundenkonto gutgeschrieben" — vagyis a kredit
 * mindig visszajár, függetlenül a 24 órás határtól. Pénzvisszafizetés nincs.
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
 * Egy óra lemondása a stúdió részéről: minden aktív foglalás lemondva,
 * a kredit visszaírva, és minden érintett kap értesítést.
 * Újrafuttatható: a már lemondott órán nem csinál semmit.
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
        // Ha az abo közben eltűnt, a foglalást akkor is le kell mondani.
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

    // A várólistán állóknak sincs már mit ajánlani.
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

  // Az értesítés a tranzakció után megy ki, hogy ne küldjünk levelet
  // olyan változásról, ami végül nem mentődött el.
  const { notified } = await sessionCancelled(payload, sessionId, reason, true)

  return { ok: true, cancelled: bookings.docs.length, refunded, notified }
}

/**
 * Nem gyűlt össze a minimum létszám. Az AGB 2 főt ír elő; a határt
 * paraméterben kapja, hogy Nadine kivételt tehessen.
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
