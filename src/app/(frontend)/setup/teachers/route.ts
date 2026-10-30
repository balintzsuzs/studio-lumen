import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Az oktatók felvétele: 60 perces órák, nyelvek, és az órák elosztása.
 *
 * A csapat ugyanaz a négy ember, mint a weboldal Über uns szakaszán —
 * különben a vendég olyan oktatót látna az órarendben, aki a honlapon
 * nem létezik.
 *
 * A `teachingLanguages` azt mondja meg, milyen nyelven tart órát, és ez
 * a VENDÉGNEK szól. A saját felületének nyelve külön mező (`language`),
 * és mindenkinél német — a kettő összekeverése miatt jött fel egyszer
 * a stúdió nézet angolul.
 *
 * Az órák elosztása **demó-adat**: a valódi beosztást a stúdió állítja
 * be az adminban.
 *
 *   curl -X POST http://localhost:3000/setup/teachers \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Újrafuttatható.
 */

const TEAM = [
  { firstName: 'Nadine', lastName: 'Hofer', languages: ['de', 'en'] },
  { firstName: 'Aline', lastName: 'Keller', languages: ['de', 'en'] },
  { firstName: 'Jana', lastName: 'Brunner', languages: ['de', 'en'] },
  // Elin angolul tart órát — enélkül a demóban nem lenne angol óra.
  { firstName: 'Elin', lastName: 'Vogt', languages: ['en'] },
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

    // --- 1. minden óra 60 perces ---
    const sessions = await payload.find({ collection: 'sessions', limit: 1000, depth: 0 })
    let retimed = 0
    for (const s of sessions.docs as any[]) {
      if (s.durationMinutes === 60) continue
      await payload.update({
        collection: 'sessions', id: s.id, data: { durationMinutes: 60 },
        context: { skipSeriesPropagation: true, skipChangeNotice: true },
      })
      retimed++
    }

    // --- 2. az óratípus alapértéke is ---
    const types = await payload.find({ collection: 'class-types', limit: 50, depth: 0 })
    for (const t of types.docs as any[]) {
      if (t.usesReformers && t.defaultDuration !== 60) {
        await payload.update({
          collection: 'class-types', id: t.id, data: { defaultDuration: 60 },
        })
      }
    }

    // --- 3. az oktatók ---
    const instructors: any[] = []
    for (const t of TEAM) {
      // Külön tartomány, mint a demó-ügyfeleké (@demo.studio-lumen.ch):
      // különben a tulajdonosnak szánt ügyfélfiók címe ütközne az övével,
      // és a fiók oktatóvá alakulna.
      const email = `${t.firstName.toLowerCase()}@team.studio-lumen.ch`
      // Előbb e-mail szerint, aztán név szerint — különben egy már
      // felvett oktatóból (más e-mail-címmel) duplikátum keletkezne.
      const byEmail = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      let u: any = (byEmail.docs as any[])[0]
      if (!u) {
        // Csak oktatót vagy admint veszünk át név alapján — egy
        // ügyfelet soha nem alakítunk oktatóvá a neve miatt.
        const byName = await payload.find({
          collection: 'users',
          where: {
            and: [
              { firstName: { equals: t.firstName } },
              { lastName: { equals: t.lastName } },
              { role: { in: ['instructor', 'admin'] } },
            ],
          },
          limit: 1, depth: 0,
        })
        u = (byName.docs as any[])[0]
      }
      /*
       * A felület nyelve: németül. Hogy angolul IS tart órát, az a
       * vendégnek szól (`teachingLanguages`), nem a saját képernyőjének.
       * A kettő összekeverése miatt jött fel egyszer a stúdió nézet
       * angolul.
       *
       * A szerepet csak akkor írjuk át, ha nem admin. A tulajdonos
       * oktatói fiókja admin jogú, és ez az útvonal újrafuttatható —
       * ha mindenkire `instructor`-t írna, egy ártatlan újrafuttatás
       * elvenné tőle a jogot, csendben. Épp azt, ami nélkül nem tud
       * órát felvenni.
       */
      if (u) {
        await payload.update({
          collection: 'users', id: u.id,
          data: {
            ...(u.role === 'admin' ? {} : { role: 'instructor' }),
            teachingLanguages: t.languages, language: 'de',
          },
        })
      } else {
        u = await payload.create({
          collection: 'users',
          data: {
            email, password, firstName: t.firstName, lastName: t.lastName,
            role: 'instructor', teachingLanguages: t.languages, language: 'de',
          },
        })
      }
      instructors.push(
        await payload.findByID({ collection: 'users', id: u.id, depth: 0 }),
      )
    }

    // --- 4. az órák elosztása, hogy a demóban legyen DE és EN is ---
    const all = instructors.filter(Boolean)
    const upcoming = await payload.find({
      collection: 'sessions', sort: 'startsAt', limit: 1000, depth: 0,
    })
    let reassigned = 0
    for (const [i, s] of (upcoming.docs as any[]).entries()) {
      const target = all[i % all.length]
      const current = typeof s.instructor === 'object' ? s.instructor?.id : s.instructor
      if (current === target.id) continue
      await payload.update({
        collection: 'sessions', id: s.id, data: { instructor: target.id },
        context: { skipSeriesPropagation: true, skipChangeNotice: true },
      })
      reassigned++
    }

    return Response.json({
      ok: true,
      retimed,
      instructors: all.map((u) => `${u.firstName} (${(u.teachingLanguages ?? []).join('/') || '—'})`),
      reassigned,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
