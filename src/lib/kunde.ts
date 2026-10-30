import 'server-only'
import type { Payload } from 'payload'
import { getReliability, type Reliability } from './attendance'
import { isYoungMember } from './abo'

/**
 * Egy vendég teljes képe a stúdió oldaláról.
 *
 * Az óra oldala azt mondja meg, kik jönnek MA; ez azt, hogy ki ez az
 * ember: hogyan érhető el, mit kell tudni róla óra előtt, mely órákon
 * volt, és melyekre jön. Ugyanazt a kérdést eddig csak az admin
 * felületen (/admin) lehetett megválaszolni, több kattintással és a
 * foglalásokat kézzel összevadászva.
 *
 * Egyetlen lekérdezés hozza a foglalásokat, és itt válik múltra és
 * jövőre — nem két kérdés, mert a határ („most”) egy pillanat, és ha
 * kétszer kérdeznénk, a kettő között elcsúszhatna.
 */

export type KundeOra = {
  bookingId: number
  sessionId: number
  /** Kezdés, ISO. */
  kezdet: string
  cim: string
  oktato?: string
  studio?: string
  gep?: string
  /** A foglalás állapota, nyers értékként — a szöveget a lap adja. */
  allapot: string
  /** Lemondásnál: időben, késve, vagy a stúdió mondta le. */
  lemondasTipus?: string
}

export type KundeProfil = {
  kunde: any
  /** Young Member a születési évből, nem külön kapcsolóból. */
  youngMember: boolean
  abok: any[]
  /** Hány kredit van összesen az élő abókon. */
  kreditOsszesen: number
  /** A legközelebbi óra elöl. */
  jovobeli: KundeOra[]
  /** A legutóbbi óra elöl. */
  korabbi: KundeOra[]
  megbizhatosag: Reliability
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

const oraSor = (b: any): KundeOra | null => {
  const s = b.session
  // Ha a kapcsolat nem jött vissza objektumként, nincs mit mutatni —
  // egy puszta azonosító sem időpontot, sem nevet nem ad.
  if (!s || typeof s !== 'object') return null
  return {
    bookingId: b.id,
    sessionId: s.id,
    kezdet: s.startsAt,
    cim: s.classType?.name ?? '',
    oktato: s.instructor?.firstName ?? undefined,
    studio: s.studio?.city ?? undefined,
    gep: b.reformer?.label ?? undefined,
    allapot: b.status,
    lemondasTipus: b.cancellationType ?? undefined,
  }
}

/** Egy vendég profilja. `null`, ha nincs ilyen ember. */
export const kundeProfil = async (
  payload: Payload,
  kundeId: number,
): Promise<KundeProfil | null> => {
  let kunde: any = null
  try {
    kunde = await payload.findByID({ collection: 'users', id: kundeId, depth: 0 })
  } catch {
    return null
  }
  if (!kunde) return null

  const abok = await payload.find({
    collection: 'abos',
    where: { customer: { equals: kundeId } },
    sort: '-purchasedAt', limit: 50, depth: 1,
  })

  /*
   * depth 2, mert az óra NEVE, oktatója és stúdiója is kell: a foglaláson
   * az óra kapcsolat, azon belül a típus egy újabb kapcsolat. Egy szinten
   * csak azonosítók jönnének, és a lista dátumokat mutatna cím nélkül.
   */
  const foglalasok = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: kundeId } },
    sort: '-bookedAt', limit: 500, depth: 2,
  })

  const most = Date.now()
  const jovobeli: KundeOra[] = []
  const korabbi: KundeOra[] = []
  for (const b of foglalasok.docs as any[]) {
    const sor = oraSor(b)
    if (!sor) continue
    // A lemondott foglalás nem jövőbeli részvétel: az ember nem jön.
    // A múltban viszont megmarad, mert a történethez hozzátartozik.
    const jovo = new Date(sor.kezdet).getTime() > most
    if (jovo && sor.allapot === 'cancelled') continue
    ;(jovo ? jovobeli : korabbi).push(sor)
  }
  jovobeli.sort((a, b) => a.kezdet.localeCompare(b.kezdet))
  korabbi.sort((a, b) => b.kezdet.localeCompare(a.kezdet))

  const eloAbok = (abok.docs as any[]).filter((a) => a.status === 'active')

  return {
    kunde,
    youngMember: isYoungMember(kunde.birthYear),
    abok: abok.docs as any[],
    kreditOsszesen: eloAbok.reduce((ossz, a) => ossz + (a.creditsRemaining ?? 0), 0),
    jovobeli,
    korabbi,
    megbizhatosag: await getReliability(payload, kundeId),
  }
}

export type KundeSor = {
  id: number
  nev: string
  email: string
  telefon?: string
  /** Van-e egészségügyi megjegyzés — a tartalma a listában nem jelenik meg. */
  egeszseg: boolean
  youngMember: boolean
  mattenKunde: boolean
}

/**
 * A vendégek listája, névre és e-mailre kereshetően.
 *
 * Az egészségügyi megjegyzésnek itt csak a LÉTE látszik, a tartalma nem.
 * Érzékeny adat, a lista pedig sok embert mutat egyszerre, és senkinek
 * nincs rá szüksége addig, amíg nem egy konkrét emberre néz. A teljes
 * szöveg a profilon és az óra jelenléti listáján van, ahol az oktató
 * épp azzal az egy emberrel foglalkozik.
 */
export const kundeLista = async (
  payload: Payload,
  kereses?: string,
): Promise<KundeSor[]> => {
  const and: any[] = [{ role: { equals: 'customer' } }]
  const q = kereses?.trim()
  if (q) and.push({ or: [{ fullName: { like: q } }, { email: { like: q } }] })

  const r = await payload.find({
    collection: 'users',
    where: { and },
    sort: 'fullName', limit: 500, depth: 0,
  })

  return (r.docs as any[]).map((u) => ({
    id: u.id,
    nev: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
    email: u.email,
    telefon: u.phone || undefined,
    egeszseg: Boolean(u.healthNotes),
    youngMember: isYoungMember(u.birthYear),
    mattenKunde: Boolean(u.isMatCustomer),
  }))
}

export { idOf }
