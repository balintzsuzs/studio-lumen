import 'server-only'
import type { HibaKulcs } from './i18n'
import type { Payload } from 'payload'

/**
 * Jelenlét: a késői lemondás és a meg nem jelenés két külön tény.
 *
 *  - késői lemondás: az ügyfél szólt, de a 24 órás határon belül
 *    (`cancellationType = 'late'`, a kredit elveszik)
 *  - no-show: nem szólt és nem jött el (`status = 'no_show'`)
 *
 * A no-show-t az óra után lehet rögzíteni; a `closeSession` az összes
 * még nyitott foglalást no-show-ra állítja, az oktató pedig egyenként
 * jelenlétre javíthatja.
 */

export type Attendance = 'attended' | 'no_show'

export const markAttendance = async (
  payload: Payload,
  bookingId: number,
  attendance: Attendance,
): Promise<{ ok: boolean; reason?: HibaKulcs }> => {
  let booking: any = null
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1 })
  } catch {
    return { ok: false, reason: 'hiba.buchung_nincs' }
  }
  if (booking.status === 'cancelled')
    return { ok: false, reason: 'hiba.sztornozott_nem_jelenlet' }

  await payload.update({
    collection: 'bookings',
    id: bookingId,
    data: { status: attendance, attendanceMarkedAt: new Date().toISOString() },
  })
  return { ok: true }
}

/**
 * Az óra lezárása: minden még nyitott foglalás MEGJELENTRE áll.
 *
 * Ez a rendszer egyik legfontosabb munkaszabálya, ezért megérdemel egy
 * bekezdést. Korábban fordítva működött: a lezárás mindenkit no-show-ra
 * állított, és az oktatónak egyenként kellett visszajavítania azokat,
 * akik ott voltak. Csakhogy a normális eset az, hogy a bejelentkezett
 * ember eljön — öt helyből jó, ha havonta egyszer marad üresen egy.
 * Az oktató tehát öt kattintást végzett azért, hogy nullát rögzítsen.
 *
 * Innentől az oktató dolga csak annyi, hogy a HIÁNYZÓT megjelölje.
 * Aki nincs megjelölve, az megjelent. Ez kevesebb munka és kevesebb
 * hiba: egy elfelejtett kattintás most nem bélyegez meg valakit
 * jogtalanul no-show-val.
 *
 * Csak már elkezdődött óránál fut le. Újrafuttatható: a már felvett
 * jelenlétet (`attended` vagy `no_show`) nem írja felül.
 */
export const closeSession = async (
  payload: Payload,
  sessionId: number,
): Promise<{ ok: boolean; marked: number; reason?: HibaKulcs }> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, marked: 0, reason: 'hiba.ora_nem_talalhato' }
  }
  if (new Date(session.startsAt) > new Date())
    return { ok: false, marked: 0, reason: 'hiba.ora_meg_nem_kezdodott' }

  const open = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }] },
    limit: 200, depth: 0,
  })
  const now = new Date().toISOString()
  for (const b of open.docs as any[]) {
    await payload.update({
      collection: 'bookings', id: b.id,
      data: { status: 'attended', attendanceMarkedAt: now },
    })
  }
  return { ok: true, marked: open.docs.length }
}

/**
 * Mennyi idő után zárja le magát egy lement óra.
 *
 * Az oktatónak kell egy ablak, amin belül bejelöli, ki hiányzott. Ha
 * rögtön óra után zárnánk, a hiányzó is megjelentként maradna; ha soha
 * nem zárnánk, a profilokon örökre „gebucht" állna. Másnap reggelre
 * mindenképp rendeződjön.
 */
export const AUTO_CLOSE_HOURS = 12

/**
 * A régen lement, még nyitott órák lezárása.
 *
 * Azért kell, mert az oktató nem fog emlékezni rá, hogy lezárjon egy
 * órát, amin semmi rendkívüli nem történt — és nem is kellene. Ha nem
 * nyúlt hozzá, az azt jelenti: mindenki ott volt.
 */
export const closeStaleSessions = async (
  payload: Payload,
  now = new Date(),
  limit = 50,
): Promise<{ sessions: number; marked: number }> => {
  const hatar = new Date(now.getTime() - AUTO_CLOSE_HOURS * 36e5).toISOString()
  const regi = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { startsAt: { less_than: hatar } },
        { status: { equals: 'scheduled' } },
      ],
    },
    sort: '-startsAt', limit, depth: 0,
  })

  let sessions = 0
  let marked = 0
  for (const s of regi.docs as any[]) {
    const r = await closeSession(payload, s.id)
    if (r.ok && r.marked > 0) {
      sessions++
      marked += r.marked
    }
  }
  return { sessions, marked }
}

export type Reliability = {
  attended: number
  noShows: number
  lateCancels: number
  inTimeCancels: number
}

/** Egy ügyfél megjelenési statisztikája, opcionálisan egy dátum óta. */
export const getReliability = async (
  payload: Payload,
  userId: number,
  since?: Date,
): Promise<Reliability> => {
  const base: any[] = [{ customer: { equals: userId } }]
  if (since) base.push({ bookedAt: { greater_than: since.toISOString() } })

  const count = async (extra: any) =>
    (await payload.find({
      collection: 'bookings',
      where: { and: [...base, extra] },
      limit: 0, depth: 0,
    })).totalDocs

  return {
    attended: await count({ status: { equals: 'attended' } }),
    noShows: await count({ status: { equals: 'no_show' } }),
    lateCancels: await count({ cancellationType: { equals: 'late' } }),
    inTimeCancels: await count({ cancellationType: { equals: 'in_time' } }),
  }
}
