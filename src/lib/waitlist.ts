import 'server-only'
import type { HibaKulcs } from './i18n'
import { closeStaleSessions } from './attendance'
import type { Payload } from 'payload'
import { getSettings, getAvailability, createBooking, type WaitlistWindow } from './booking'
import { waitlistOffer, waitlistReleased } from './notify'

/**
 * Várólista lépcsőzetes ajánlati ablakkal.
 *
 * Az iparági gyakorlat (FitDegree, Hapana, Momence) nem fix időt ad a
 * válaszra, hanem annál rövidebbet, minél közelebb az óra: 48 óránál
 * több idő esetén akár 12 óra, 13 óra alatt már csak percek. Fix 6 óra
 * két órával az óra előtt értelmetlen lenne.
 *
 * A `waitlistLockHours`-on belül már nem ajánlunk senkinek: a hely
 * azonnal mindenki számára szabaddá válik, a várakozók értesítést
 * kapnak, hogy foglalhatnak.
 */

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

/** Az adott órához tartozó ajánlati ablak percben. */
export const offerMinutesFor = (windows: WaitlistWindow[], startsAt: Date, now = new Date()): number => {
  const hoursLeft = (startsAt.getTime() - now.getTime()) / 36e5
  const sorted = [...windows].sort((a, b) => b.fromHoursBefore - a.fromHoursBefore)
  for (const w of sorted) if (hoursLeft >= w.fromHoursBefore) return w.offerMinutes
  // Ha minden lépcső fölötte van (pl. már elkezdődött), a legrövidebb jár.
  return sorted[sorted.length - 1]?.offerMinutes ?? 20
}

export type JoinResult = { ok: true; entryId: number; position: number } | { ok: false; reason: HibaKulcs }

/** Feliratkozás a várólistára. Csak tele óránál, és csak egyszer. */
export const joinWaitlist = async (
  payload: Payload,
  userId: number,
  sessionId: number,
): Promise<JoinResult> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.ora_nincs' }
  }
  if (session.status === 'cancelled') return { ok: false, reason: 'hiba.ora_lemondva' }
  if (new Date(session.startsAt) <= new Date())
    return { ok: false, reason: 'hiba.ora_elkezdodott' }

  const free = (await getAvailability(payload, sessionId)).filter((r) => r.status === 'free')
  if (free.length) return { ok: false, reason: 'hiba.van_szabad_hely' }

  const own = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { customer: { equals: userId } },
        { status: { in: ['waiting', 'offered'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (own.totalDocs > 0) return { ok: false, reason: 'hiba.mar_varolistan' }

  const all = await payload.find({
    collection: 'waitlist-entries',
    where: { session: { equals: sessionId } },
    sort: '-position', limit: 1, depth: 0,
  })
  const position = ((all.docs as any[])[0]?.position ?? 0) + 1

  const entry = await payload.create({
    collection: 'waitlist-entries',
    data: { session: sessionId, customer: userId, position, status: 'waiting' },
  })
  return { ok: true, entryId: entry.id as number, position }
}

/** Kilépés a várólistáról. */
export const leaveWaitlist = async (
  payload: Payload,
  userId: number,
  entryId: number,
): Promise<{ ok: boolean; reason?: HibaKulcs }> => {
  let entry: any = null
  try {
    entry = await payload.findByID({ collection: 'waitlist-entries', id: entryId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.bejegyzes_nincs' }
  }
  if (idOf(entry.customer) !== userId) return { ok: false, reason: 'hiba.nem_a_te_bejegyzesed' }
  await payload.update({
    collection: 'waitlist-entries', id: entryId, data: { status: 'withdrawn' },
  })
  return { ok: true }
}

export type Offer = {
  entryId: number
  customerId: number
  sessionId: number
  expiresAt: Date
  offerMinutes: number
}

export type PromoteResult =
  | { kind: 'offered'; offer: Offer }
  | { kind: 'released'; entryIds: number[] } // lock-ablakon belül: mindenkinek szabad
  | { kind: 'nothing'; reason: HibaKulcs }

/**
 * Felszabadult hely kiajánlása a sor első várakozójának.
 * Lemondás után és egy perces ütemezőből is hívható, idempotens:
 * ha már van élő ajánlat, nem ad ki másodikat.
 */
export const promoteWaitlist = async (
  payload: Payload,
  sessionId: number,
  now = new Date(),
): Promise<PromoteResult> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { kind: 'nothing', reason: 'hiba.ora_nem_talalhato' }
  }
  const startsAt = new Date(session.startsAt)
  if (session.status === 'cancelled' || startsAt <= now)
    return { kind: 'nothing', reason: 'hiba.ora_nem_foglalhato' }

  const free = (await getAvailability(payload, sessionId)).filter((r) => r.status === 'free')
  if (!free.length) return { kind: 'nothing', reason: 'hiba.nincs_szabad_hely' }

  // Van-e már élő ajánlat? Akkor hagyjuk lejárni.
  const live = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { status: { equals: 'offered' } },
        { offerExpiresAt: { greater_than: now.toISOString() } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (live.totalDocs > 0) return { kind: 'nothing', reason: 'hiba.mar_fut_ajanlat' }

  const waiting = await payload.find({
    collection: 'waitlist-entries',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'waiting' } }] },
    sort: 'position', limit: 100, depth: 0,
  })
  if (!waiting.docs.length) return { kind: 'nothing', reason: 'hiba.senki_a_varolistan' }

  const { waitlistWindows, waitlistLockHours } = await getSettings(payload)
  const hoursLeft = (startsAt.getTime() - now.getTime()) / 36e5

  // Túl közel az óra: nincs értelme egyvalakit megvárni — mindenki foglalhat.
  if (hoursLeft < waitlistLockHours) {
    const ids: number[] = []
    for (const e of waiting.docs as any[]) {
      await payload.update({
        collection: 'waitlist-entries', id: e.id,
        data: { status: 'expired', notifiedAt: now.toISOString() },
      })
      ids.push(e.id)
      await waitlistReleased(payload, idOf(e.customer), sessionId)
    }
    return { kind: 'released', entryIds: ids }
  }

  const first = (waiting.docs as any[])[0]
  const offerMinutes = offerMinutesFor(waitlistWindows, startsAt, now)
  // Az ajánlat soha ne nyúljon túl a lock-ablak kezdetén.
  const latest = new Date(startsAt.getTime() - waitlistLockHours * 36e5)
  const expiresAt = new Date(Math.min(now.getTime() + offerMinutes * 60000, latest.getTime()))

  await payload.update({
    collection: 'waitlist-entries', id: first.id,
    data: {
      status: 'offered',
      notifiedAt: now.toISOString(),
      offerExpiresAt: expiresAt.toISOString(),
    },
  })

  await waitlistOffer(payload, idOf(first.customer), sessionId, expiresAt)

  return {
    kind: 'offered',
    offer: {
      entryId: first.id,
      customerId: idOf(first.customer),
      sessionId,
      expiresAt,
      offerMinutes,
    },
  }
}

/**
 * Minden jövőbeli óra, ahol valaki vár és közben szabad lett hely.
 *
 * A lemondás maga is kiajánlja a helyet, de nem minden felszabadulás
 * megy lemondáson át: egy gép visszakerül karbantartásból, az admin
 * töröl egy foglalást, vagy a kiajánlás egyszer hibára fut. Ez a söprés
 * ezeket fogja be, ezért az ütemező mindig lefuttatja.
 */
export const sweepOpenSpots = async (
  payload: Payload,
  now = new Date(),
): Promise<{ promoted: number }> => {
  const waiting = await payload.find({
    collection: 'waitlist-entries',
    where: { status: { equals: 'waiting' } },
    limit: 500, depth: 0,
  })
  const sessionIds = [...new Set((waiting.docs as any[]).map((e) => idOf(e.session)))]

  let promoted = 0
  for (const sessionId of sessionIds) {
    const r = await promoteWaitlist(payload, sessionId, now)
    if (r.kind === 'offered' || r.kind === 'released') promoted++
  }
  return { promoted }
}

/**
 * Lejárt ajánlatok elévültté tétele és a következő ember kiajánlása.
 * Ütemezőből hívandó (a prototípusban a /setup/waitlist-tick útvonal).
 */
export const expireOffers = async (
  payload: Payload,
  now = new Date(),
): Promise<{ expired: number; promoted: number }> => {
  const stale = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { status: { equals: 'offered' } },
        { offerExpiresAt: { less_than_equal: now.toISOString() } },
      ],
    },
    limit: 200, depth: 0,
  })

  const touched = new Set<number>()
  for (const e of stale.docs as any[]) {
    await payload.update({
      collection: 'waitlist-entries', id: e.id, data: { status: 'expired' },
    })
    touched.add(idOf(e.session))
  }

  let promoted = 0
  for (const sessionId of touched) {
    const r = await promoteWaitlist(payload, sessionId, now)
    if (r.kind === 'offered') promoted++
  }
  return { expired: stale.docs.length, promoted }
}

/** Egy ütemező-kör: lejáratás, majd söprés a szabaddá vált helyekre. */
export const runWaitlistTick = async (
  payload: Payload,
  now = new Date(),
): Promise<{ expired: number; promoted: number; closed: number }> => {
  const a = await expireOffers(payload, now)
  const b = await sweepOpenSpots(payload, now)
  /*
   * A régen lement órák lezárása itt kap ütemet, ugyanazon az okon,
   * mint a várólista: a Vercel ingyenes csomagján a cron naponta csak
   * egyszer fut, tehát az első látogató hozza magával az ütemet.
   */
  const c = await closeStaleSessions(payload, now)
  return { expired: a.expired, promoted: a.promoted + b.promoted, closed: c.sessions }
}

/**
 * Az ajánlat beváltása: a várólistás lefoglalja a felszabadult helyet.
 * Csak a saját, még élő ajánlatával lehet.
 */
export const claimOffer = async (
  payload: Payload,
  userId: number,
  entryId: number,
  reformerId?: number,
  now = new Date(),
): Promise<{ ok: true; bookingId: number } | { ok: false; reason: HibaKulcs }> => {
  let entry: any = null
  try {
    entry = await payload.findByID({ collection: 'waitlist-entries', id: entryId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.bejegyzes_nincs' }
  }
  if (idOf(entry.customer) !== userId) return { ok: false, reason: 'hiba.nem_a_te_bejegyzesed' }
  if (entry.status !== 'offered') return { ok: false, reason: 'hiba.nincs_ajanlatod' }
  if (!entry.offerExpiresAt || new Date(entry.offerExpiresAt) <= now)
    return { ok: false, reason: 'hiba.ajanlat_lejart' }

  const booked = await createBooking(payload, userId, idOf(entry.session), reformerId)
  if (!booked.ok) return booked

  await payload.update({
    collection: 'waitlist-entries', id: entryId, data: { status: 'converted' },
  })
  return booked
}

/** Az ügyfél aktuális várólista-bejegyzése ezen az órán, ha van. */
export const getMyEntry = async (
  payload: Payload,
  userId: number,
  sessionId: number,
): Promise<any | null> => {
  const r = await payload.find({
    collection: 'waitlist-entries',
    where: {
      and: [
        { session: { equals: sessionId } },
        { customer: { equals: userId } },
        { status: { in: ['waiting', 'offered'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  return (r.docs as any[])[0] ?? null
}

/** Hányan várnak még az adott órára. */
export const countWaiting = async (payload: Payload, sessionId: number): Promise<number> =>
  (await payload.find({
    collection: 'waitlist-entries',
    where: { and: [{ session: { equals: sessionId } }, { status: { in: ['waiting', 'offered'] } }] },
    limit: 0, depth: 0,
  })).totalDocs

/**
 * Lusta ütemező: oldalbetöltéskor fut, de legfeljebb percenként egyszer.
 *
 * A Vercel ingyenes csomagján a cron **naponta csak egyszer** futhat —
 * egy percenkénti ütemezés már a deploynál elbukna. Egy várólista-ajánlat
 * viszont percekben jár le, úgyhogy a tényleges taktust ez adja: aki
 * megnyitja az órarendet, az egyben le is pörgeti a kört. A napi cron
 * mellette biztonsági háló marad arra az esetre, ha senki nem jár az
 * oldalon.
 *
 * Az utolsó futás ideje a BookingSettings globalban van, nem memóriában,
 * mert a szerverless példányok nem osztoznak a memórián.
 */
export const maybeTick = async (
  payload: Payload,
  minIntervalSeconds = 60,
  now = new Date(),
): Promise<{ ran: boolean; expired?: number; promoted?: number; closed?: number }> => {
  try {
    const settings: any = await payload.findGlobal({ slug: 'booking-settings' })
    const last = settings?.lastWaitlistTickAt ? new Date(settings.lastWaitlistTickAt) : null
    if (last && (now.getTime() - last.getTime()) / 1000 < minIntervalSeconds) {
      return { ran: false }
    }

    // Előbb jelöljük meg, hogy futunk: két egyidejű kérés közül csak az
    // egyik fusson végig. Nem zár ki minden versenyt, de a kiajánlás
    // maga is ellenőrzi, hogy van-e már élő ajánlat.
    await payload.updateGlobal({
      slug: 'booking-settings',
      data: { lastWaitlistTickAt: now.toISOString() },
    })

    const r = await runWaitlistTick(payload, now)
    return { ran: true, ...r }
  } catch {
    // Az órarend megjelenítését soha ne akassza meg az ütemező.
    return { ran: false }
  }
}
