import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getAvailability } from '@/lib/booking'
import { getReliability } from '@/lib/attendance'
import { reszvetelSzoveg, tarifaJelzesek } from '@/lib/resztvevo'
import { dayLabel, timeLabel, dateTimeLabel, languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs, type SzotarKulcs } from '@/lib/i18n'
import { AUTO_CLOSE_HOURS } from '@/lib/attendance'
import { setAttendance, close, cancelLesson, cancelTooFew, deleteLesson } from './actions'

export const dynamic = 'force-dynamic'

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

const STATUS_KULCS: Record<string, SzotarKulcs> = {
  booked: 'oktora.status_booked',
  attended: 'oktora.status_attended',
  no_show: 'oktora.status_no_show',
  cancelled: 'oktora.status_cancelled',
}

export default async function LessonPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    fehler?: string; erfasst?: string; geschlossen?: string; abgesagt?: string
    angelegt?: string
  }>
}) {
  const { id } = await params
  const { fehler, erfasst, geschlossen, abgesagt, angelegt } = await searchParams
  const sessionId = Number(id)

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/unterricht/${sessionId}`)
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = forditó(lang)

  const payload = await getPayload({ config })
  let session: any
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 1 })
  } catch {
    notFound()
  }
  if (!session) notFound()
  // Any instructor may open any class — see the list page for why.

  const bookings = await payload.find({
    collection: 'bookings',
    where: { session: { equals: sessionId } },
    // depth 2: through the pass we also need the pass's TYPE (name,
    // credits), otherwise only an id would come back.
    sort: 'bookedAt', limit: 200, depth: 2,
  })
  const rows = bookings.docs as any[]
  const active = rows.filter((b) => b.status !== 'cancelled')
  const open = rows.filter((b) => b.status === 'booked')

  const waiting = await payload.find({
    collection: 'waitlist-entries',
    where: { and: [{ session: { equals: sessionId } }, { status: { in: ['waiting', 'offered'] } }] },
    sort: 'position', limit: 50, depth: 1,
  })

  const spots = await getAvailability(payload, sessionId)
  const isPast = new Date(session.startsAt) <= new Date()
  const isCancelled = session.status === 'cancelled'

  // Attendance statistics only matter for a past class, and they only
  // help the instructor decide who is worth asking.
  const stats = isPast
    ? new Map(await Promise.all(active.map(async (b) =>
        [b.id, await getReliability(payload, idOf(b.customer))] as const,
      )))
    : null

  return (
    <main className="shell wide">
      <p className="back"><Link href="/unterricht">{t('kozos.unterricht_vissza')}</Link></p>

      <p className="eyebrow">{session.studio?.city}</p>
      <h1>{session.classType?.name}</h1>
      <p className="lead">
        {dayLabel(session.startsAt, lang)}, {timeLabel(session.startsAt, lang)}
        {lang === 'de' ? ' Uhr' : ''} ·{' '}
        {session.durationMinutes} {t('kozos.minuten')}
        {languageLabel(session) && ` · ${languageLabel(session)}`}
        {/* Who teaches the class. Now that every instructor sees every
            class, everyone needs this — otherwise they cannot tell
            whose class they have opened. */}
        {session.instructor
          ? ` · ${session.instructor.firstName} ${session.instructor.lastName ?? ''}`
          : ''}
      </p>

      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      {angelegt && <p className="ok">{t('ujora.letrejott')}</p>}
      {erfasst && <p className="ok">{t('oktora.felveve')}</p>}
      {geschlossen && (
        <p className="ok">
          {t('oktora.lezarva', {
            db: geschlossen,
            szo: Number(geschlossen) === 1 ? t('oktora.buchung') : t('oktora.buchungen'),
          })}
        </p>
      )}
      {abgesagt && (
        <p className="ok">
          {t('oktora.lemondva_info', {
            db: abgesagt,
            szo: Number(abgesagt) === 1 ? t('oktora.person') : t('oktora.personen'),
          })}
        </p>
      )}
      {isCancelled && (
        <p className="alert">
          {t('oktora.mar_lemondva', {
            ok: session.cancellationReason ? `: ${session.cancellationReason}` : '.',
          })}
        </p>
      )}

      <section className="day">
        <h2>{t('oktora.resztvevok', { db: active.length, osszes: spots.length })}</h2>

        {rows.length === 0 && <p className="empty">{t('oktora.nincs_jelentkezo')}</p>}

        {rows.length > 0 && (
          <div className="tabla-keret">
          <table className="list">
            <thead>
              <tr>
                <th>{t('oktora.fejlec_nev')}</th>
                <th>{t('oktora.fejlec_geraet')}</th>
                <th>{t('oktora.fejlec_teilnahme')}</th>
                <th>{t('oktora.fejlec_status')}</th>
                {isPast && <th>{t('oktora.fejlec_anwesenheit')}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const rel = stats?.get(b.id)
                return (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'muted' : ''}>
                    <td>
                      {b.customer?.id ? (
                        <Link href={`/kunden/${b.customer.id}`}>
                          {b.customer.firstName} {b.customer.lastName}
                        </Link>
                      ) : (
                        <>{b.customer?.firstName} {b.customer?.lastName}</>
                      )}
                      {tarifaJelzesek(b.customer, t).length > 0 && (
                        <span className="tag">
                          {tarifaJelzesek(b.customer, t).join(' · ')}
                        </span>
                      )}
                      {b.customer?.healthNotes && (
                        <span className="tag egeszseg">
                          {t('oktora.gesundheit')}: {b.customer.healthNotes}
                        </span>
                      )}
                      {rel && (rel.noShows > 0 || rel.lateCancels > 0) && (
                        <span className="tag">
                          {rel.noShows > 0 && t('oktora.nem_jelent_meg_x', { db: rel.noShows })}
                          {rel.noShows > 0 && rel.lateCancels > 0 && ' · '}
                          {rel.lateCancels > 0 && t('oktora.keson_mondta_le_x', { db: rel.lateCancels })}
                        </span>
                      )}
                    </td>
                    <td>{b.reformer?.label ?? '—'}</td>
                    <td>{reszvetelSzoveg(b, t)}</td>
                    <td>
                      {/* On a finished class "gebucht" is not a status
                          but a not-touched-yet: by the rule, it means
                          attended. Do not say anything other than what
                          the system is going to do. */}
                      {isPast && b.status === 'booked'
                        ? t('oktora.gilt_anwesend')
                        : STATUS_KULCS[b.status] ? t(STATUS_KULCS[b.status]) : b.status}
                      {b.status === 'cancelled' && b.cancellationType === 'late' && t('oktora.storno_keso')}
                      {b.status === 'cancelled' && b.cancellationType === 'by_studio' && t('oktora.storno_studio')}
                    </td>
                    {isPast && (
                      <td>
                        {b.status === 'cancelled' ? '—' : (
                          /*
                           * One button, not two. The instructor only
                           * marks who was absent; there is nothing to
                           * do about someone who turned up. The mark
                           * can be undone, because anyone can misclick.
                           */
                          <form action={setAttendance}>
                            <input type="hidden" name="sessionId" value={sessionId} />
                            <input type="hidden" name="bookingId" value={b.id} />
                            <input
                              type="hidden"
                              name="value"
                              value={b.status === 'no_show' ? 'attended' : 'no_show'}
                            />
                            <button
                              type="submit"
                              className={`mini ${b.status === 'no_show' ? 'on' : ''}`}
                            >
                              {b.status === 'no_show'
                                ? t('oktora.megis_ott_volt')
                                : t('oktora.fehlt')}
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}

        {isPast && !isCancelled && (
          <p className="hint">{t('oktora.jelenlet_hint', { ora: AUTO_CLOSE_HOURS })}</p>
        )}

        {isPast && open.length > 0 && !isCancelled && (
          <form action={close} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <button className="btn ghost" type="submit">
              {t('oktora.lezaras_gomb', { db: open.length })}
            </button>
          </form>
        )}
      </section>

      {waiting.docs.length > 0 && (
        <section className="day">
          <h2>{t('oktora.varolista_cim', { db: waiting.docs.length })}</h2>
          <ul className="plain">
            {(waiting.docs as any[]).map((w) => (
              <li key={w.id}>
                {w.position}. {w.customer?.firstName} {w.customer?.lastName}
                {w.status === 'offered' && w.offerExpiresAt && (
                  <span className="tag">
                    {t('oktora.hely_ajanlva', { datum: dateTimeLabel(w.offerExpiresAt, lang) })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isCancelled && !isPast && (
        <section className="day danger">
          <h2>{t('oktora.lemondas_cim')}</h2>
          <p className="hint">{t('oktora.lemondas_hint')}</p>

          <form action={cancelLesson} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              type="text"
              name="reason"
              placeholder={t('oktora.ok_placeholder')}
              required
            />
            <button className="btn" type="submit">{t('oktora.lemond_gomb')}</button>
          </form>

          {active.length < 2 && (
            <form action={cancelTooFew} className="blockform">
              <input type="hidden" name="sessionId" value={sessionId} />
              <button className="btn ghost" type="submit">{t('oktora.keves_gomb')}</button>
            </form>
          )}
        </section>
      )}

      {/*
        Deleting is for admins only, and only on an empty class. Where
        there are participants, cancelling is the right tool: it refunds
        the credit and tells everyone, while deleting would make the
        class vanish without a trace. So the button is not even rendered
        when there is anyone it would affect.
      */}
      {user.role === 'admin' && active.length === 0 && (
        <section className="day danger">
          <h2>{t('ujora.torol_cim')}</h2>
          <p className="hint">{t('ujora.torol_hint')}</p>
          <form action={deleteLesson} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <button className="btn ghost" type="submit">{t('ujora.torol_gomb')}</button>
          </form>
        </section>
      )}
    </main>
  )
}
