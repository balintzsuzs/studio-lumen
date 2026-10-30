import 'server-only'
import type { Payload, PayloadRequest } from 'payload'

/**
 * Ismétlődő órák. A sorozat a szabály, a `sessions` rekordok a tények.
 *
 *  - `generateSessions` legenerálja a hiányzó órákat a sorozat időszakára
 *  - `propagateToFutureSessions` átviszi egy óra módosítását a sorozat
 *    többi, még jövőbeli és le nem szakított órájára
 *
 * Az időpontot svájci helyi időből számoljuk, hogy a nyári időszámítás
 * váltásakor ne csússzon el egy órával ("minden hétfő 09:00" egész évben
 * 09:00 maradjon).
 */

const ZONE = 'Europe/Zurich'

/** A zóna eltolása percben az adott pillanatban. */
const zoneOffsetMinutes = (at: Date): number => {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of f.formatToParts(at)) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  )
  return (asUtc - at.getTime()) / 60000
}

/** Svájci helyi dátum+idő → UTC pillanat. */
export const zoneToUtc = (y: number, m: number, d: number, hh: number, mm: number): Date => {
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  let guess = new Date(naive)
  // Két kör elég: az első az eltolást adja, a második a DST-határt is kezeli.
  for (let i = 0; i < 2; i++) guess = new Date(naive - zoneOffsetMinutes(guess) * 60000)
  return guess
}

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export type GenerateResult = { created: number; skipped: number }

/**
 * A sorozat minden érintett napjára létrehozza az órát, ha még nincs.
 * Újrafuttatható: a meglévőket érintetlenül hagyja.
 */
export const generateSessions = async (
  payload: Payload,
  seriesId: number,
): Promise<GenerateResult> => {
  const series: any = await payload.findByID({ collection: 'session-series', id: seriesId, depth: 0 })
  const weekday = Number(series.weekday)
  const [hh, mm] = String(series.timeOfDay).split(':').map(Number)

  const from = new Date(series.startsOn)
  const to = new Date(series.endsOn)

  // A sorozat már legenerált órái, hogy ne duplikáljunk.
  const existing = await payload.find({
    collection: 'sessions',
    where: { series: { equals: seriesId } },
    limit: 1000, depth: 0,
  })
  const taken = new Set((existing.docs as any[]).map((s) => new Date(s.startsAt).getTime()))

  let created = 0
  let skipped = 0

  // Napról napra lépünk a sorozat időszakán, UTC-ben számolt naptári
  // napokkal, de az időpontot helyi időből képezzük.
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const last = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())

  while (cursor.getTime() <= last) {
    if (cursor.getUTCDay() === weekday) {
      const startsAt = zoneToUtc(
        cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate(), hh, mm,
      )
      if (taken.has(startsAt.getTime())) {
        skipped++
      } else {
        await payload.create({
          collection: 'sessions',
          data: {
            classType: idOf(series.classType),
            studio: idOf(series.studio),
            instructor: idOf(series.instructor),
            startsAt: startsAt.toISOString(),
            durationMinutes: series.durationMinutes,
            status: 'scheduled',
            series: seriesId,
            detached: false,
            editScope: 'only_this',
          },
          context: { skipSeriesPropagation: true },
        })
        created++
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return { created, skipped }
}

/**
 * A megadott óra módosítását átviszi a sorozat többi jövőbeli órájára.
 *
 * Átvitt mezők: óratípus, stúdió, oktató, hossz, napszak, állapot, hinweis.
 * A dátum nem: minden óra a saját napján marad, csak az időpontja igazodik.
 * Leszakított (`detached`) órákat nem ír át.
 */
export const propagateToFutureSessions = async (
  payload: Payload,
  source: any,
  req?: PayloadRequest,
): Promise<{ updated: number }> => {
  const seriesId = idOf(source.series)
  const sourceStart = new Date(source.startsAt)

  const siblings = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { series: { equals: seriesId } },
        { id: { not_equals: source.id } },
        { startsAt: { greater_than: sourceStart.toISOString() } },
        { detached: { not_equals: true } },
      ],
    },
    limit: 1000, depth: 0,
  })

  // A forrás óra napszaka svájci helyi időben — ezt kapják a többiek is.
  const local = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, hour12: false, hour: '2-digit', minute: '2-digit',
  }).format(sourceStart)
  const [hh, mm] = local.split(':').map(Number)

  let updated = 0
  for (const s of siblings.docs as any[]) {
    const day = new Date(s.startsAt)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(day).split('-').map(Number)
    const startsAt = zoneToUtc(parts[0], parts[1], parts[2], hh, mm)

    await payload.update({
      collection: 'sessions',
      id: s.id,
      data: {
        classType: idOf(source.classType),
        studio: idOf(source.studio),
        instructor: idOf(source.instructor),
        durationMinutes: source.durationMinutes,
        status: source.status,
        note: source.note ?? null,
        startsAt: startsAt.toISOString(),
      },
      context: { skipSeriesPropagation: true },
      req,
    })
    updated++
  }

  // A sorozat szabálya is kövesse a változást, hogy a később generált
  // órák ne a régi adatokkal készüljenek.
  await payload.update({
    collection: 'session-series',
    id: seriesId,
    data: {
      classType: idOf(source.classType),
      studio: idOf(source.studio),
      instructor: idOf(source.instructor),
      durationMinutes: source.durationMinutes,
      timeOfDay: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    },
    context: { skipSeriesPropagation: true },
    req,
  })

  // A forrás órán visszaállítjuk a hatókört, hogy a következő mentés
  // ne terjesszen újra akaratlanul.
  await payload.update({
    collection: 'sessions',
    id: source.id,
    data: { editScope: 'only_this' },
    context: { skipSeriesPropagation: true },
    req,
  })

  return { updated }
}
