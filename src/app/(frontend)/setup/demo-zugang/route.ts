import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * A demó két belépése, a /demo útmutató lapon meghirdetve.
 *
 * Az ügyfél-fiók szándékosan NEM a tulajdonos oktatói fiókja: azt a
 * rendszer az óráihoz használja, és egy jelszóval kiküldött belépés
 * hozzáférést adna az oktatói nézethez is. Ez a fiók sima ügyfél,
 * kredittel — pont annyit lát, amennyit egy vendég.
 *
 *   curl -X POST http://localhost:3000/setup/demo-zugang \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Újrafuttatható: ha a fiók már van, csak a jelszót és a kreditet állítja.
 */
const EMAIL = 'kundin@demo.studio-lumen.ch'

/*
 * A stúdió-oldali fiók. Erre is kell jelszó, mert a demó lényege, hogy
 * MINDKÉT oldal látható legyen: amit az ügyfél lát, és amit a stúdió.
 * Ez a fiók admin jogú — a tulajdonosé: órát vesz fel és töröl,
 * abo-megrendelést szabadít fel, és mindenki foglalását látja.
 */
const OKTATO_EMAIL = 'nadine@team.studio-lumen.ch'

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

    const talalat = await payload.find({
      collection: 'users', where: { email: { equals: EMAIL } }, limit: 1, depth: 0,
    })
    let user: any = (talalat.docs as any[])[0]

    if (user) {
      await payload.update({ collection: 'users', id: user.id, data: { password } })
    } else {
      user = await payload.create({
        collection: 'users',
        data: {
          email: EMAIL, password,
          firstName: 'Demo', lastName: 'Kundin',
          role: 'customer', language: 'de',
        },
      })
    }

    // Legyen min. 10 kredit, hogy ne akadjon el foglalás közben.
    const aboType: any = (await payload.find({
      collection: 'abo-types', where: { name: { equals: '10er Abo' } }, limit: 1, depth: 0,
    })).docs[0]
    const megvan = await payload.find({
      collection: 'abos',
      where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
      limit: 1, depth: 0,
    })
    const letezo: any = (megvan.docs as any[])[0]
    const lejar = new Date()
    lejar.setMonth(lejar.getMonth() + 7)

    if (letezo) {
      await payload.update({
        collection: 'abos', id: letezo.id,
        data: { creditsRemaining: 10, expiresAt: lejar.toISOString() },
      })
    } else if (aboType) {
      await payload.create({
        collection: 'abos',
        data: {
          customer: user.id, aboType: aboType.id, creditsRemaining: 10,
          purchasedAt: new Date().toISOString(), expiresAt: lejar.toISOString(),
          status: 'active', paymentMethod: 'on_site', paidAt: new Date().toISOString(),
        },
      })
    }

    /*
     * A stúdió-oldali fiók. Jelszót kap, és ADMIN jogot.
     *
     * Eddig oktatói jogú volt, abból a megfontolásból, hogy minél
     * kevesebbhez férjen hozzá. Ez félreértés volt: a fiók a stúdió
     * tulajdonosáé, nem beosztott oktatóé. Admin nélkül nem jut be a
     * /verwaltung lapra, nem vehet fel és nem törölhet órát — vagyis
     * épp azt nem lehetne kipróbálni, ami a legtöbbet elmondja: hogy
     * a rendszert a tulajdonos maga tudja-e kezelni.
     */
    const oktato: any = (await payload.find({
      collection: 'users', where: { email: { equals: OKTATO_EMAIL } }, limit: 1, depth: 0,
    })).docs[0]
    let stabFiok: string | null = null
    if (oktato) {
      await payload.update({
        collection: 'users', id: oktato.id,
        data: { password, role: 'admin', language: 'de' },
      })
      // Visszaolvassuk: a szerep mezőnek saját írási korlátja van, és egy
      // csendben elmaradt módosítás pont azt venné el, amiért a hívás
      // van. A script ebből látja, sikerült-e.
      const ellenor: any = await payload.findByID({
        collection: 'users', id: oktato.id, depth: 0,
      })
      stabFiok = `${ellenor.email} (${ellenor.role}, ${ellenor.language})`
    }

    return Response.json({
      ok: true,
      stab: stabFiok,
      kundin: EMAIL,
      studio: oktato ? OKTATO_EMAIL : null,
      credits: 10,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
