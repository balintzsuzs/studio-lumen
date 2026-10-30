import { getPayload } from 'payload'
import config from '@payload-config'
import { createBooking, getAvailability } from '@/lib/booking'
import { joinWaitlist } from '@/lib/waitlist'
import { orderAbo } from '@/lib/abo'
import { markAttendance } from '@/lib/attendance'

/**
 * Bemutató-adatok: egy demó-ügyfél kreditekkel, és néhány foglalás,
 * hogy a teremtérkép ne üresen álljon.
 *
 * Csak ALLOW_SEED=true mellett fut, tehát élesben nem elérhető —
 * helyből hívjuk, a termelési adatbázisra mutatva.
 *
 *   curl -X POST "http://localhost:3000/setup/demo-data" \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Újrafuttatható: ami már létezik, azt nem hozza létre újra.
 */

const DEMO_DOMAIN = '@demo.studio-lumen.ch'

/*
 * A fő demó-ügyfél. Korábban „Nadine Demo" volt, a
 * `nadine@demo.studio-lumen.ch` címen — csakhogy ezen a címen Nadine
 * Hofer OKTATÓ fiókja ül. A régi hívás tehát nem demó-ügyfelet
 * hozott létre, hanem az oktató fiókjára akasztott ügyfél-abót, és így
 * került Nadine az ügyfelek közé. Nadine az oktatók közé tartozik.
 *
 * Innentől a demó-ügyfélnek saját, ütközésmentes címe van, és az
 * `ensure()` nem nyúl olyan fiókhoz, ami nem ügyfél.
 */
const DEMO_UGYFEL = { email: 'sandra', firstName: 'Sandra', lastName: 'Demo' }

/*
 * A demó-látogatók, akik a térképen foglaltként látszanak.
 *
 * Hatan vannak, mert a bemutatóhoz egy órát teljesen meg kell tölteni —
 * Zugban hat reformer van. Enélkül a várólista nem mutatható meg,
 * márpedig az a rendszer egyik legfontosabb képessége.
 */
const EXTRAS = [
  { firstName: 'Andrea', lastName: 'Demo' },
  { firstName: 'Beatrice', lastName: 'Demo' },
  { firstName: 'Carla', lastName: 'Demo' },
  { firstName: 'Doris', lastName: 'Demo' },
  { firstName: 'Eva', lastName: 'Demo' },
  { firstName: 'Franziska', lastName: 'Demo' },
]

export async function POST(request: Request) {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }

  let password = ''
  try {
    password = String(((await request.json()) as { password?: string }).password ?? '')
  } catch {
    password = ''
  }
  if (password.length < 8) {
    return Response.json({ error: 'password fehlt (min. 8 Zeichen)' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config })

    const aboType: any = (await payload.find({
      collection: 'abo-types', where: { name: { equals: '10er Abo' } }, limit: 1, depth: 0,
    })).docs[0]
    if (!aboType) return Response.json({ error: 'Abo-Typ fehlt, zuerst /setup/seed' }, { status: 400 })

    /** Ügyfél + aktív abo, ha még nincs. */
    const ensure = async (
      email: string, firstName: string, lastName: string, credits: number,
    ) => {
      const found = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      let user: any = (found.docs as any[])[0]
      // Védőkorlát: ha ezen a címen nem ügyfél ül, nem nyúlunk hozzá.
      // Így egy demó-adat futtatás nem tud oktatói fiókra abót akasztani.
      if (user && user.role !== 'customer') {
        throw new Error(
          `${email} nem ügyfél (${user.role}) — a demó-adat nem ír felül oktatói fiókot`,
        )
      }
      if (!user) {
        user = await payload.create({
          collection: 'users',
          data: { email, password, firstName, lastName, role: 'customer' },
        })
      } else {
        // A jelszót a meglévő demó-fióknál is beállítjuk. Enélkül a
        // második futás után senki sem tud belépni demó-ügyfélként: a
        // fiók megvan, de a jelszava egy korábbi futásból maradt, amit
        // már nem tud senki. A bemutatón pedig épp azt kell megmutatni,
        // mit lát az ügyfél.
        await payload.update({ collection: 'users', id: user.id, data: { password } })
      }
      const abo = await payload.find({
        collection: 'abos',
        where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
        limit: 1, depth: 0,
      })
      const expires = new Date()
      expires.setMonth(expires.getMonth() + 7)
      if (!abo.totalDocs) {
        await payload.create({
          collection: 'abos',
          data: {
            customer: user.id, aboType: aboType.id, creditsRemaining: credits,
            purchasedAt: new Date().toISOString(), expiresAt: expires.toISOString(),
            status: 'active', paymentMethod: 'on_site', paidAt: new Date().toISOString(),
          },
        })
      } else {
        /*
         * A kreditet minden futáson visszatöltjük, az érvényességgel együtt.
         *
         * A foglalás kreditet fogyaszt, tehát a harmadik-negyedik
         * demó-előkészítés után a vendégeknek nulla marad, és a további
         * foglalások csendben elmaradnak: üres órák, üres történet, és
         * semmi jele, hogy miért. A demó-előkészítés nem „ha nincs, hozd
         * létre", hanem ismert állapotba állítás.
         */
        await payload.update({
          collection: 'abos', id: (abo.docs as any[])[0].id,
          data: { creditsRemaining: credits, expiresAt: expires.toISOString() },
        })
      }
      return user
    }

    const demo = await ensure(
      `${DEMO_UGYFEL.email}${DEMO_DOMAIN}`,
      DEMO_UGYFEL.firstName, DEMO_UGYFEL.lastName, 10,
    )
    const extras = []
    for (let i = 0; i < EXTRAS.length; i++) {
      const e = EXTRAS[i]
      extras.push(await ensure(`gast${i + 1}${DEMO_DOMAIN}`, e.firstName, e.lastName, 10))
    }

    // Néhány közelgő órára foglalunk, hogy legyen mit látni a térképen.
    const upcoming = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { greater_than: new Date().toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      // Három nap órái kellenek, nem hét darab: naponta négy óra van.
      sort: 'startsAt', limit: 16, depth: 0,
    })
    const orak = upcoming.docs as any[]

    let booked = 0

    /*
     * Telt órák várólistával — a következő HÁROM napra, nem csak a
     * legközelebbi órára.
     *
     * A betelt óra és a sorban állás a rendszer egyik legtöbbet érő
     * része, ezt a bemutatón látni kell. Korábban csak a soron következő
     * óra telt meg: ha az előkészítés ma délután futott, az az óra
     * holnapra már a múltban volt, és a bemutató üres órarendet mutatott.
     * Így három napon át van mit megnézni, akkor is, ha senki nem futtat
     * újra semmit.
     *
     * Zürichben öt gép van, és hat demó-vendég — pont annyi, hogy egy
     * ember a várólistára kerüljön. Zugban hat gép van, ott nem
     * maradna senki, ezért ott nem keresünk telt órát.
     */
    const teltOrak: number[] = []
    let varolistan = 0
    const hasznaltNapok = new Set<string>()

    for (const s of orak) {
      if (teltOrak.length >= 3) break
      const nap = s.startsAt.slice(0, 10)
      if (hasznaltNapok.has(nap)) continue

      const helyek = await getAvailability(payload, s.id)
      // Csak ott, ahol kevesebb a hely, mint a vendég — különben nem
      // telik be, és várólista sem lesz.
      if (helyek.length === 0 || helyek.length >= extras.length) continue

      let ide = 0
      for (const u of extras.slice(0, helyek.length)) {
        const r = await createBooking(payload, u.id, s.id)
        if (r.ok) { booked++; ide++ }
      }
      if (ide === 0) continue

      hasznaltNapok.add(nap)
      teltOrak.push(s.id)

      // Aki már nem fért be, az a várólistára kerül.
      for (const u of extras.slice(helyek.length)) {
        const r = await joinWaitlist(payload, u.id, s.id)
        if (r.ok) varolistan++
      }
    }
    const teltOra: number | null = teltOrak[0] ?? null

    // A többi óra részben telik meg, hogy a térkép ne legyen egyforma.
    let reszben = 0
    for (const s of orak) {
      if (teltOrak.includes(s.id)) continue
      const howMany = [2, 3, 1, 3, 2][reszben % 5]
      reszben++
      for (const u of extras.slice(0, howMany)) {
        const r = await createBooking(payload, u.id, s.id)
        if (r.ok) booked++
      }
    }

    /*
     * Történet a múltban: a lement órákon rögzítjük a jelenlétet.
     *
     * Enélkül a vendég profilján minden elmúlt óra „gebucht" marad, a
     * statisztika nulla, és a bemutatón úgy látszik, mintha nem működne —
     * pedig csak senki nem vette fel a jelenlétet.
     *
     * Nem új foglalásokat gyártunk: a lement órákon már vannak foglalások
     * a korábbi futásokból, csak nyitva maradtak. Egy új foglalás ezekkel
     * ütközne (ugyanaz az ember, ugyanaz az óra), és csendben elmaradna.
     * A stúdió is ugyanezt teszi óra után: felveszi a jelenlétet.
     */
    let multbeli = 0
    let nemJott = 0
    const multOrak = (await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { startsAt: { less_than: new Date().toISOString() } },
          { status: { equals: 'scheduled' } },
        ],
      },
      sort: '-startsAt', limit: 6, depth: 0,
    })).docs as any[]

    for (const [i, ora] of multOrak.entries()) {
      const nyitott = (await payload.find({
        collection: 'bookings',
        where: {
          and: [{ session: { equals: ora.id } }, { status: { equals: 'booked' } }],
        },
        sort: 'bookedAt', limit: 20, depth: 0,
      })).docs as any[]

      for (const [j, b] of nyitott.entries()) {
        // A legutóbbi órán egy ember nem jelent meg. A no-show nem
        // elméleti eset: a megbízhatósági statisztika rajta látszik.
        const nemjelent = i === 0 && j === nyitott.length - 1 && nyitott.length > 1
        const r = await markAttendance(payload, b.id, nemjelent ? 'no_show' : 'attended')
        if (!r.ok) continue
        if (nemjelent) nemJott++
        else multbeli++
      }
    }

    // Egy nyitott abo-megrendelés, hogy a Verwaltung lapon legyen teendő.
    let nyitottRendeles: string | null = null
    const utolso = extras[extras.length - 1]
    if (utolso) {
      const r = await orderAbo(payload, utolso.id, aboType.id, 'transfer')
      if (r.ok) nyitottRendeles = utolso.email
    }

    return Response.json({
      ok: true,
      demoUser: demo.email,
      extras: extras.length,
      bookings: booked,
      // A bemutatóhoz: ez az óra telt meg, ezen látszik a várólista.
      volleSession: teltOra,
      volleSessions: teltOrak,
      warteliste: varolistan,
      vergangeneBesuche: multbeli,
      nichtErschienen: nemJott,
      offeneBestellung: nyitottRendeles,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
