import { getPayload } from 'payload'
import config from '@payload-config'
import { napKulcs } from '@/lib/naptar'
import { getAvailability } from '@/lib/booking'

/**
 * „Bemutatható-e?" — egy hívás, ami végigméri a bemutató előfeltételeit.
 *
 * Olvas, nem ír, ezért az éles adatbázison is futhat. Az `ALLOW_SEED`
 * nem feltétele: pont akkor kell tudni használni, amikor a setup-útvonalak
 * már zárva vannak.
 *
 *   curl http://localhost:3000/setup/demo-check
 */

type Pont = { rendben: boolean; cim: string; reszlet: string; teendo?: string }

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const pontok: Pont[] = []
    const szam = async (collection: any, where: any) =>
      (await payload.find({ collection, where, limit: 0, depth: 0 })).totalDocs

    // 1. Teszt-maradék
    const tesztFiok = await szam('users', { email: { like: '@test.local' } })
    const tesztOra = await szam('sessions', { note: { equals: 'TEST' } })
    const sorozat = await szam('session-series', {})
    const szemet = tesztFiok + tesztOra + sorozat
    pontok.push({
      rendben: szemet === 0,
      cim: 'Nincs teszt-maradék',
      reszlet: `${tesztFiok} teszt-fiók, ${tesztOra} TEST-óra, ${sorozat} sorozat`,
      teendo: szemet > 0
        ? 'Valaki tesztet futtatott ezen az adatbázison. Ki kell takarítani, mielőtt bárki látja.'
        : undefined,
    })

    // 2. Emberek
    const osszes = await szam('users', {})
    /*
     * Az admin is oktat: Nadine a stúdió tulajdonosa, és órát is tart.
     * Amíg csak az `instructor` szerepet számoltuk, a szerepe átállítása
     * hibának látszott — pedig épp az volt a javítás.
     */
    const oktato = await szam('users', { role: { in: ['instructor', 'admin'] } })
    pontok.push({
      rendben: osszes <= 20 && oktato >= 3,
      cim: 'Az emberek listája rendezett',
      reszlet: `${osszes} ember, ebből ${oktato} oktat`,
      teendo: osszes > 20 ? 'Túl sok fiók — valószínűleg maradék.' : undefined,
    })

    // 3. Van-e egyáltalán jövőbeli óra
    const most = new Date()
    const jovo = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { greater_than: most.toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      sort: 'startsAt', limit: 40, depth: 0,
    })
    pontok.push({
      rendben: jovo.totalDocs >= 10,
      cim: 'Van elég jövőbeli óra',
      reszlet: `${jovo.totalDocs} óra a következő időszakban`,
      teendo: jovo.totalDocs < 10 ? 'Az órarend kifogyott: POST /setup/sessions' : undefined,
    })

    /*
     * 4. Telt óra várólistával — ez évül el leghamarabb.
     *
     * Nem elég, hogy MOST van ilyen: a bemutató lehet holnap is. Ezért
     * azt nézzük, hány NAPON át van még telt óra várólistával. Ha csak
     * ma, az nem elég: ha estére marad, holnapra üres órarendet mutat.
     */
    const teltNapok = new Set<string>()
    let teltOra: any = null
    let varolistan = 0
    for (const s of jovo.docs as any[]) {
      const szabad = (await getAvailability(payload, s.id)).filter((r) => r.status === 'free')
      if (szabad.length > 0) continue
      const varnak = await szam('waitlist-entries', {
        and: [{ session: { equals: s.id } }, { status: { in: ['waiting', 'offered'] } }],
      })
      if (varnak === 0) continue
      teltNapok.add(napKulcs(s.startsAt))
      if (!teltOra) { teltOra = s; varolistan = varnak }
    }
    const oraig = teltOra
      ? Math.round((new Date(teltOra.startsAt).getTime() - most.getTime()) / 36e5)
      : null
    pontok.push({
      rendben: teltNapok.size >= 2,
      cim: 'Telt óra várólistával, több napra',
      reszlet: teltOra
        ? `${teltNapok.size} napon; a legközelebbi ${oraig} óra múlva, ${varolistan} a várólistán`
        : 'nincs telt jövőbeli óra',
      teendo: teltNapok.size < 2
        ? teltNapok.size === 1
          ? 'Csak MA van telt óra — holnapra elfogy. Frissítsd: POST /setup/demo-data'
          : 'A bemutató legerősebb része hiányzik. Frissítsd: POST /setup/demo-data'
        : undefined,
    })

    // 5. Nyitott abo-megrendelés a Verwaltung oldalra
    const nyitott = await szam('abos', { status: { equals: 'pending' } })
    pontok.push({
      rendben: nyitott > 0,
      cim: 'Van nyitott abo-megrendelés',
      reszlet: `${nyitott} darab`,
      teendo: nyitott === 0
        ? 'A Verwaltung oldal üresen állna. Frissítsd: POST /setup/demo-data'
        : undefined,
    })

    // 6. Demó-ügyfél kredittel
    const demo = (await payload.find({
      collection: 'users',
      where: { email: { equals: 'sandra@demo.studio-lumen.ch' } },
      limit: 1, depth: 0,
    })).docs[0] as any
    const kredit = demo
      ? (await payload.find({
          collection: 'abos',
          where: { and: [{ customer: { equals: demo.id } }, { status: { equals: 'active' } }] },
          limit: 1, depth: 0,
        })).docs[0] as any
      : null
    pontok.push({
      rendben: Boolean(kredit?.creditsRemaining > 0),
      cim: 'A demó-ügyfél tud foglalni',
      reszlet: demo
        ? `${demo.firstName} ${demo.lastName}, ${kredit?.creditsRemaining ?? 0} kredit`
        : 'nincs demó-ügyfél',
      teendo: !kredit?.creditsRemaining
        ? 'Nem tudnál foglalást mutatni. Frissítsd: POST /setup/demo-data'
        : undefined,
    })

    const hibak = pontok.filter((p) => !p.rendben)
    return Response.json({
      bemutathato: hibak.length === 0,
      ellenorzesek: pontok.length,
      hibak: hibak.length,
      pontok,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
