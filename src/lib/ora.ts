import 'server-only'
import type { Payload } from 'payload'
import type { HibaKulcs } from './i18n'
import { zoneToUtc } from './series'

/**
 * Egyedi óra felvétele és törlése a stúdió oldaláról.
 *
 * A rendszeres órák a sorozatokból (`session-series`) jönnek; ez az
 * egyszeri alkalmakra való: pótóra, workshop, egy elmaradt óra új
 * időpontja. A tulajdonosnak ezt a Payload admin felülete nélkül is tudnia
 * kell, mert ott nyolc mezőt lát, és közülük háromnak a jelentése
 * nélkülünk nem derül ki.
 */

export type UjOra = {
  /** 'ÉÉÉÉ-HH-NN', svájci naptári nap. */
  nap: string
  /** 'ÓÓ:PP', svájci helyi idő. */
  ido: string
  classTypeId: number
  studioId: number
  instructorId: number
  perc: number
  /** Üresen: az oktató nyelvei érvényesek. */
  nyelvek?: ('de' | 'en')[]
  megjegyzes?: string
}

const NAP = /^\d{4}-\d{2}-\d{2}$/
const IDO = /^([01]\d|2[0-3]):[0-5]\d$/

export const createSession = async (
  payload: Payload,
  ora: UjOra,
  now = new Date(),
): Promise<{ ok: true; sessionId: number } | { ok: false; reason: HibaKulcs }> => {
  if (!NAP.test(ora.nap) || !IDO.test(ora.ido)) return { ok: false, reason: 'hiba.ora_ervenytelen_idopont' }
  if (!(ora.perc > 0) || ora.perc > 300) return { ok: false, reason: 'hiba.ora_ervenytelen_hossz' }

  const [y, m, d] = ora.nap.split('-').map(Number)
  const [hh, mm] = ora.ido.split(':').map(Number)
  // Svájci helyi időben adjuk meg, UTC-ben tároljuk — ugyanaz a
  // szabály, mint a sorozatoknál, különben a nyári időszámítás
  // határán egy órát csúszna.
  const kezdet = zoneToUtc(y, m, d, hh, mm)

  // A múltba felvett óra senkinek sem jó: foglalni sem lehet rá, és a
  // lezárás rögtön megjelentre állítana mindenkit — aki ott sem volt.
  if (kezdet <= now) return { ok: false, reason: 'hiba.ora_a_multban' }

  // Az oktatónak oktatónak kell lennie, a stúdiónak és a típusnak léteznie.
  const [oktato, studio, tipus] = await Promise.all([
    payload.findByID({ collection: 'users', id: ora.instructorId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'studios', id: ora.studioId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: 'class-types', id: ora.classTypeId, depth: 0 }).catch(() => null),
  ])
  if (!studio || !tipus) return { ok: false, reason: 'hiba.ora_hianyzo_adat' }
  if (!oktato || ((oktato as any).role !== 'instructor' && (oktato as any).role !== 'admin'))
    return { ok: false, reason: 'hiba.ora_nem_oktato' }

  /*
   * Ütközés: ugyanaz az oktató, ugyanabban a percben. Nem a terem a
   * szűk keresztmetszet (két stúdió van), hanem az ember. Ha ezt nem
   * néznénk, egy elgépelt dátum két órát tenne ugyanarra az időpontra,
   * és csak a vendégek vennék észre.
   */
  const utkozes = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { instructor: { equals: ora.instructorId } },
        { startsAt: { equals: kezdet.toISOString() } },
        { status: { equals: 'scheduled' } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (utkozes.totalDocs > 0) return { ok: false, reason: 'hiba.ora_utkozik' }

  const created = await payload.create({
    collection: 'sessions',
    data: {
      classType: ora.classTypeId,
      studio: ora.studioId,
      instructor: ora.instructorId,
      startsAt: kezdet.toISOString(),
      durationMinutes: ora.perc,
      status: 'scheduled',
      ...(ora.nyelvek?.length ? { languages: ora.nyelvek } : {}),
      ...(ora.megjegyzes ? { note: ora.megjegyzes } : {}),
    },
  })
  return { ok: true, sessionId: (created as any).id }
}

/**
 * Óra törlése.
 *
 * Csak akkor, ha senki nincs rajta. Ahol van jelentkező, ott a törlés
 * rossz eszköz: nyomtalanul tűnne el egy óra, amire emberek beírták
 * magukat, a kreditjük nem jönne vissza, és értesítést sem kapnának.
 * Arra a lemondás (`cancelSessionByStudio`) való — az mindenkit
 * visszatérít és értesít, és az óra nyoma megmarad.
 *
 * A lemondott, üres órát viszont lehet takarítani: az már senkié.
 */
export const deleteSession = async (
  payload: Payload,
  sessionId: number,
): Promise<{ ok: true } | { ok: false; reason: HibaKulcs }> => {
  let session: any = null
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    return { ok: false, reason: 'hiba.ora_nem_talalhato' }
  }
  if (!session) return { ok: false, reason: 'hiba.ora_nem_talalhato' }

  const elo = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { session: { equals: sessionId } },
        { status: { in: ['booked', 'attended', 'no_show'] } },
      ],
    },
    limit: 1, depth: 0,
  })
  if (elo.totalDocs > 0) return { ok: false, reason: 'hiba.ora_van_jelentkezo' }

  // A lemondott foglalások és a várólista törölhetők vele együtt:
  // önmagukban semmit nem jelentenek.
  const maradek = await payload.find({
    collection: 'bookings',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const b of maradek.docs as any[]) {
    await payload.delete({ collection: 'bookings', id: b.id })
  }
  const varok = await payload.find({
    collection: 'waitlist-entries',
    where: { session: { equals: sessionId } },
    limit: 200, depth: 0,
  })
  for (const w of varok.docs as any[]) {
    await payload.delete({ collection: 'waitlist-entries', id: w.id })
  }

  await payload.delete({ collection: 'sessions', id: sessionId })
  return { ok: true }
}
