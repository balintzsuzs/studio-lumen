import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Setting up the instructors: 60-minute classes, languages, and sharing
 * the classes out between them.
 *
 * The team is the same four people as in the website's Über uns
 * section — otherwise a visitor would see an instructor in the schedule
 * who does not exist on the site.
 *
 * `teachingLanguages` says which language they teach in, and that is
 * for the CUSTOMER. The language of their own screen is a separate
 * field (`language`), German for everyone — confusing the two is what
 * once made the studio view come up in English.
 *
 * Sharing out the classes is **demo data**: the real timetable is set
 * by the studio in the admin.
 *
 *   curl -X POST http://localhost:3000/setup/teachers \
 *     -H 'content-type: application/json' -d '{"password":"..."}'
 *
 * Re-runnable.
 */

const TEAM = [
  { firstName: 'Nadine', lastName: 'Hofer', languages: ['de', 'en'] },
  { firstName: 'Aline', lastName: 'Keller', languages: ['de', 'en'] },
  { firstName: 'Jana', lastName: 'Brunner', languages: ['de', 'en'] },
  // Elin teaches in English — without her there would be no English class in the demo.
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

    // --- 1. every class is 60 minutes ---
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

    // --- 2. and the class type's default too ---
    const types = await payload.find({ collection: 'class-types', limit: 50, depth: 0 })
    for (const t of types.docs as any[]) {
      if (t.usesReformers && t.defaultDuration !== 60) {
        await payload.update({
          collection: 'class-types', id: t.id, data: { defaultDuration: 60 },
        })
      }
    }

    // --- 3. the instructors ---
    const instructors: any[] = []
    for (const t of TEAM) {
      // A separate domain, as for the demo customers
      // (@demo.studio-lumen.ch): otherwise the demo customer account's
      // address would collide with hers and the account would turn
      // into an instructor.
      const email = `${t.firstName.toLowerCase()}@team.studio-lumen.ch`
      // By email first, then by name — otherwise an instructor who is
      // already on file (under a different address) would be
      // duplicated.
      const byEmail = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      let u: any = (byEmail.docs as any[])[0]
      if (!u) {
        // Only an instructor or an admin is matched by name — we
        // never turn a customer into an instructor because of their
        // name.
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
       * Their interface language: German. That they ALSO teach in
       * English is for the customer (`teachingLanguages`), not for
       * their own screen. Confusing the two is what once made the
       * studio view come up in English.
       *
       * The role is only rewritten when it is not already admin. The
       * owner's instructor account is an admin, and this route is
       * re-runnable — if it wrote `instructor` over everyone, an
       * innocent re-run would take that away from her, silently.
       * Exactly the thing without which she cannot create a class.
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

    // --- 4. share out the classes, so the demo has both DE and EN ---
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
