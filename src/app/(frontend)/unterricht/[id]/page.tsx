import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getAvailability } from '@/lib/booking'
import { getReliability } from '@/lib/attendance'
import { attendanceText, tariffTags } from '@/lib/participant'
import { dayLabel, timeLabel, dateTimeLabel, languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey, type DictionaryKey } from '@/lib/i18n'
import { AUTO_CLOSE_HOURS } from '@/lib/attendance'
import { setAttendance, close, cancelLesson, cancelTooFew, deleteLesson } from './actions'

export const dynamic = 'force-dynamic'

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

const STATUS_KEYS: Record<string, DictionaryKey> = {
  booked: 'lesson.status_booked',
  attended: 'lesson.status_attended',
  no_show: 'lesson.status_no_show',
  cancelled: 'lesson.status_cancelled',
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
  const t = translator(lang)

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
      <p className="back"><Link href="/unterricht">{t('common.teaching_back')}</Link></p>

      <p className="eyebrow">{session.studio?.city}</p>
      <h1>{session.classType?.name}</h1>
      <p className="lead">
        {dayLabel(session.startsAt, lang)}, {timeLabel(session.startsAt, lang)}
        {lang === 'de' ? ' Uhr' : ''} ·{' '}
        {session.durationMinutes} {t('common.minutes')}
        {languageLabel(session) && ` · ${languageLabel(session)}`}
        {/* Who teaches the class. Now that every instructor sees every
            class, everyone needs this — otherwise they cannot tell
            whose class they have opened. */}
        {session.instructor
          ? ` · ${session.instructor.firstName} ${session.instructor.lastName ?? ''}`
          : ''}
      </p>

      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      {angelegt && <p className="ok">{t('newclass.created')}</p>}
      {erfasst && <p className="ok">{t('lesson.attendance_saved')}</p>}
      {geschlossen && (
        <p className="ok">
          {t('lesson.closed', {
            count: geschlossen,
            word: Number(geschlossen) === 1 ? t('lesson.booking') : t('lesson.bookings'),
          })}
        </p>
      )}
      {abgesagt && (
        <p className="ok">
          {t('lesson.cancelled_info', {
            count: abgesagt,
            word: Number(abgesagt) === 1 ? t('lesson.person') : t('lesson.people'),
          })}
        </p>
      )}
      {isCancelled && (
        <p className="alert">
          {t('lesson.already_cancelled', {
            reason: session.cancellationReason ? `: ${session.cancellationReason}` : '.',
          })}
        </p>
      )}

      <section className="day">
        <h2>{t('lesson.participants', { count: active.length, total: spots.length })}</h2>

        {rows.length === 0 && <p className="empty">{t('lesson.no_registrations')}</p>}

        {rows.length > 0 && (
          <div className="table-frame">
          <table className="list">
            <thead>
              <tr>
                <th>{t('lesson.col_name')}</th>
                <th>{t('lesson.col_reformer')}</th>
                <th>{t('lesson.col_attending_with')}</th>
                <th>{t('lesson.col_status')}</th>
                {isPast && <th>{t('lesson.col_attendance')}</th>}
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
                      {tariffTags(b.customer, t).length > 0 && (
                        <span className="tag">
                          {tariffTags(b.customer, t).join(' · ')}
                        </span>
                      )}
                      {b.customer?.healthNotes && (
                        <span className="tag health">
                          {t('lesson.health')}: {b.customer.healthNotes}
                        </span>
                      )}
                      {rel && (rel.noShows > 0 || rel.lateCancels > 0) && (
                        <span className="tag">
                          {rel.noShows > 0 && t('lesson.no_show_count', { count: rel.noShows })}
                          {rel.noShows > 0 && rel.lateCancels > 0 && ' · '}
                          {rel.lateCancels > 0 && t('lesson.late_cancel_count', { count: rel.lateCancels })}
                        </span>
                      )}
                    </td>
                    <td>{b.reformer?.label ?? '—'}</td>
                    <td>{attendanceText(b, t)}</td>
                    <td>
                      {/* On a finished class "gebucht" is not a status
                          but a not-touched-yet: by the rule, it means
                          attended. Do not say anything other than what
                          the system is going to do. */}
                      {isPast && b.status === 'booked'
                        ? t('lesson.counts_present')
                        : STATUS_KEYS[b.status] ? t(STATUS_KEYS[b.status]) : b.status}
                      {b.status === 'cancelled' && b.cancellationType === 'late' && t('lesson.cancel_late')}
                      {b.status === 'cancelled' && b.cancellationType === 'by_studio' && t('lesson.cancel_studio')}
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
                                ? t('lesson.was_here_after_all')
                                : t('lesson.absent')}
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
          <p className="hint">{t('lesson.attendance_hint', { hours: AUTO_CLOSE_HOURS })}</p>
        )}

        {isPast && open.length > 0 && !isCancelled && (
          <form action={close} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <button className="btn ghost" type="submit">
              {t('lesson.close_button', { count: open.length })}
            </button>
          </form>
        )}
      </section>

      {waiting.docs.length > 0 && (
        <section className="day">
          <h2>{t('lesson.waitlist_title', { count: waiting.docs.length })}</h2>
          <ul className="plain">
            {(waiting.docs as any[]).map((w) => (
              <li key={w.id}>
                {w.position}. {w.customer?.firstName} {w.customer?.lastName}
                {w.status === 'offered' && w.offerExpiresAt && (
                  <span className="tag">
                    {t('lesson.spot_offered', { date: dateTimeLabel(w.offerExpiresAt, lang) })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isCancelled && !isPast && (
        <section className="day danger">
          <h2>{t('lesson.cancel_title')}</h2>
          <p className="hint">{t('lesson.cancel_hint')}</p>

          <form action={cancelLesson} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              type="text"
              name="reason"
              placeholder={t('lesson.reason_placeholder')}
              required
            />
            <button className="btn" type="submit">{t('lesson.cancel_button')}</button>
          </form>

          {active.length < 2 && (
            <form action={cancelTooFew} className="blockform">
              <input type="hidden" name="sessionId" value={sessionId} />
              <button className="btn ghost" type="submit">{t('lesson.too_few_button')}</button>
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
          <h2>{t('newclass.delete_title')}</h2>
          <p className="hint">{t('newclass.delete_hint')}</p>
          <form action={deleteLesson} className="blockform">
            <input type="hidden" name="sessionId" value={sessionId} />
            <button className="btn ghost" type="submit">{t('newclass.delete_button')}</button>
          </form>
        </section>
      )}
    </main>
  )
}
