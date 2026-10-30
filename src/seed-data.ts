/**
 * Seeds the prototype's base data.
 *
 * Run with:  curl -X POST http://localhost:3000/setup/seed
 * Re-runnable: anything that already exists is skipped.
 *
 * Rooms (fictional studio, fictional equipment):
 *   Zürich  6 machines — 3 rows of 2, the first row at the mirror
 *   Zug     4 machines — a smaller room, 2 rows of 2
 */
import type { Payload } from 'payload'

const studios = [
  {
    name: 'Studio Lumen Zürich',
    city: 'Zürich',
    street: 'Werkgasse 7',
    postalCode: '8004',
    rows: 3,
    layout: [2, 2, 2], // machines per row, row 1 at the mirror
  },
  {
    name: 'Studio Lumen Zug',
    city: 'Zug',
    street: 'Lindenhof 3',
    postalCode: '6300',
    rows: 2,
    layout: [2, 2],
  },
]

const aboTypes = [
  { name: 'Schnupperlektion', credits: 1, priceChf: 35, validMonths: 0.25, tier: 'standard', sortOrder: 10 },
  { name: 'Einzelstunde', credits: 1, priceChf: 45, validMonths: 0.25, tier: 'standard', sortOrder: 20 },
  { name: '5er Abo', credits: 5, priceChf: 215, validMonths: 5, tier: 'standard', sortOrder: 30 },
  { name: '10er Abo', credits: 10, priceChf: 400, validMonths: 7, tier: 'standard', sortOrder: 40 },
  { name: '20er Abo', credits: 20, priceChf: 760, validMonths: 12, tier: 'standard', sortOrder: 50 },
  { name: '3er Abo', credits: 3, priceChf: 129, validMonths: 3, tier: 'standard', voucherOnly: true, sortOrder: 60 },
  { name: 'Schnupperlektion, reduziert', credits: 1, priceChf: 25, validMonths: 0.25, tier: 'reduced', sortOrder: 70 },
  { name: 'Einzelstunde, reduziert', credits: 1, priceChf: 40, validMonths: 0.25, tier: 'reduced', sortOrder: 80 },
  { name: '5er Abo, reduziert', credits: 5, priceChf: 195, validMonths: 5, tier: 'reduced', sortOrder: 90 },
  { name: '10er Abo, reduziert', credits: 10, priceChf: 360, validMonths: 7, tier: 'reduced', sortOrder: 100 },
]

const classTypes = [
  { name: 'Reformer Flow', creditCost: 1, defaultDuration: 60, usesReformers: true,
    description: 'Reformer Pilates in kleiner Gruppe, barfuss oder in rutschfesten Socken.' },
  { name: 'Matten Pilates, Gruppe', creditCost: 1, defaultDuration: 60, usesReformers: false,
    description: 'Gruppentraining auf der Matte in Zürich.' },
  { name: 'Pilates Care', creditCost: 1, defaultDuration: 60, usesReformers: false,
    description: 'Klinisches Pilates, langsamer und kontrollierter.' },
]

export const seed = async (payload: Payload) => {

  // --- studios and machines ---
  for (const s of studios) {
    const existing = await payload.find({
      collection: 'studios', where: { name: { equals: s.name } }, limit: 1,
    })
    let studio = existing.docs[0]
    if (!studio) {
      studio = await payload.create({
        collection: 'studios',
        data: {
          name: s.name, city: s.city, street: s.street,
          postalCode: s.postalCode, rows: s.rows,
          reformerCount: s.layout.reduce((a, b) => a + b, 0),
        },
      })
      console.log('Studio angelegt:', s.name)
    } else {
      console.log('Studio existiert:', s.name)
    }

    let n = 0
    for (let row = 1; row <= s.layout.length; row++) {
      for (let col = 1; col <= s.layout[row - 1]; col++) {
        n++
        const label = `Reformer ${n}`
        const found = await payload.find({
          collection: 'reformers',
          where: { and: [{ label: { equals: label } }, { studio: { equals: studio.id } }] },
          limit: 1,
        })
        if (found.docs.length) continue
        await payload.create({
          collection: 'reformers',
          data: { label, studio: studio.id, row, column: col, status: 'active' },
        })
        console.log(`  ${s.city}: ${label} (Reihe ${row}, Position ${col})`)
      }
    }
  }

  // --- pass types ---
  for (const a of aboTypes) {
    const found = await payload.find({
      collection: 'abo-types', where: { name: { equals: a.name } }, limit: 1,
    })
    if (found.docs.length) continue
    await payload.create({ collection: 'abo-types', data: { ...a, active: true } })
    console.log('Abo-Typ angelegt:', a.name, `CHF ${a.priceChf}`)
  }

  // --- class types ---
  for (const c of classTypes) {
    const found = await payload.find({
      collection: 'class-types', where: { name: { equals: c.name } }, limit: 1,
    })
    if (found.docs.length) continue
    await payload.create({ collection: 'class-types', data: c })
    console.log('Kursart angelegt:', c.name)
  }

  // --- booking rules ---
  await payload.updateGlobal({
    slug: 'booking-settings',
    data: {
      cancellationHours: 24,
      waitlistOfferHours: 6,
      allowReformerChoice: true,
    },
  })
  console.log('Buchungsregeln gesetzt: 24 Stunden Stornofrist')

  return 'ok'
}

/**
 * A test schedule for the next two weeks, so there is something to
 * book. Reformer Flow in both studios, weekday mornings and evenings.
 */
export const seedSessions = async (payload: any) => {
  const studios = await payload.find({ collection: 'studios', limit: 10, depth: 0 })
  const types = await payload.find({ collection: 'class-types', limit: 10, depth: 0 })
  const reformerType = types.docs.find((t: any) => t.name === 'Reformer Flow')
  const instructors = await payload.find({
    collection: 'users',
    where: { role: { in: ['admin', 'instructor'] } },
    limit: 5, depth: 0,
  })
  if (!reformerType || !instructors.docs.length) return 'missing base data'

  /*
   * Classes are handed to the instructors in rotation. Without this
   * every new class would belong to the same person, and the language
   * variety would vanish from the schedule — which is exactly what
   * shows that Elin teaches in English and the others in both German
   * and English.
   */
  const instructorList = instructors.docs as any[]
  let next = 0
  let created = 0

  for (let day = 1; day <= 14; day++) {
    const d = new Date()
    d.setDate(d.getDate() + day)
    const weekday = d.getDay()
    if (weekday === 0) continue // closed on Sundays

    for (const studio of studios.docs as any[]) {
      for (const hour of [9, 18]) {
        const start = new Date(d)
        start.setHours(hour, 0, 0, 0)

        const exists = await payload.find({
          collection: 'sessions',
          where: {
            and: [
              { studio: { equals: studio.id } },
              { startsAt: { equals: start.toISOString() } },
            ],
          },
          limit: 1, depth: 0,
        })
        if (exists.totalDocs) continue

        await payload.create({
          collection: 'sessions',
          data: {
            classType: reformerType.id,
            studio: studio.id,
            instructor: instructorList[next++ % instructorList.length].id,
            startsAt: start.toISOString(),
            durationMinutes: 60,
            status: 'scheduled',
          },
        })
        created++
      }
    }
  }
  return `${created} Lektionen angelegt`
}
