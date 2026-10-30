import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAvailability, isClosed, findUsableAbo, getSettings } from '@/lib/booking'
import { getMyEntry, countWaiting, offerMinutesFor, maybeTick } from '@/lib/waitlist'
import { getCurrentUser } from '@/lib/auth'
import { dayLabel, timeLabel, dateTimeLabel, shortDateLabel, languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey } from '@/lib/i18n'
import { book, joinList, leaveList, claim } from './actions'

export const dynamic = 'force-dynamic'

export default async function SessionPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ fehler?: string; warteliste?: string; abgemeldet?: string }>
}) {
  const { id } = await params
  const { fehler, warteliste, abgemeldet } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  /*
   * Instructors and admins go to the studio view. They are not here to
   * book: they want to see who signed up and what the class's details
   * are. The old path (floor plan plus a "Buchen" button) was a dead
   * end for them.
   */
  if (user?.role === 'instructor' || user?.role === 'admin') {
    redirect(`/unterricht/${Number(id)}`)
  }
  const lang = await getLang(user)
  const t = translator(lang)
  await maybeTick(payload)

  let session: any
  try {
    session = await payload.findByID({ collection: 'sessions', id: Number(id), depth: 1 })
  } catch {
    notFound()
  }
  if (!session) notFound()

  const spots = await getAvailability(payload, Number(id))
  const closure = await isClosed(payload, session)
  const abo = user ? await findUsableAbo(payload, user.id as number) : null
  const settings = await getSettings(payload)

  const free = spots.filter((s) => s.status === 'free').length
  const rows = [...new Set(spots.map((s) => s.row))].sort((a, b) => a - b)

  const startsAt = new Date(session.startsAt)
  const isPast = startsAt <= new Date()
  const full = free === 0

  const entry = user ? await getMyEntry(payload, user.id as number, Number(id)) : null
  const waitingCount = await countWaiting(payload, Number(id))

  // A live offer: the person whose turn it is may book, but only until the deadline.
  const hasLiveOffer =
    entry?.status === 'offered' &&
    entry.offerExpiresAt &&
    new Date(entry.offerExpiresAt) > new Date()

  // How long they would have to respond if a spot opened up now — we
  // show this before they join, so it does not catch them out.
  const windowMinutes = offerMinutesFor(settings.waitlistWindows, startsAt)
  const windowLabel =
    windowMinutes >= 120
      ? `${Math.round(windowMinutes / 60)} ${t('common.hours')}`
      : `${windowMinutes} ${t('common.minutes')}`

  const canBook = Boolean(user && abo && free > 0 && !closure && !isPast)
  const canJoin = Boolean(user && full && !closure && !isPast && !entry)

  return (
    <main className="shell">
      <p className="back"><Link href="/buchen">{t('common.schedule_back')}</Link></p>

      <p className="eyebrow">{session.studio?.city}</p>
      <h1>{session.classType?.name}</h1>
      <p className="lead">
        {dayLabel(session.startsAt, lang)}, {timeLabel(session.startsAt, lang)}
        {lang === 'de' ? ' Uhr' : ''} ·{' '}
        {session.durationMinutes} {t('common.minutes')} · {session.instructor?.firstName}
        {languageLabel(session) && ` · ${languageLabel(session)}`}
      </p>

      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      {warteliste && (
        <p className="ok">{t('class.waitlist_position', { position: warteliste })}</p>
      )}
      {abgemeldet && <p className="ok">{t('class.left_waitlist')}</p>}
      {closure && <p className="alert">{t('class.closed', { reason: closure })}</p>}
      {session.status === 'cancelled' && (
        <p className="alert">
          {t('class.cancelled', {
            reason: session.cancellationReason ? `: ${session.cancellationReason}` : '.',
          })}
        </p>
      )}
      {isPast && session.status !== 'cancelled' && (
        <p className="alert">{t('class.already_started')}</p>
      )}

      {hasLiveOffer && (
        <section className="offer">
          <h2>{t('class.offer_title')}</h2>
          <p className="hint">
            {t('class.offer_text_before')}{' '}
            <strong>{dateTimeLabel(entry.offerExpiresAt, lang)}</strong>
            {t('class.offer_text_after')}
          </p>
        </section>
      )}

      <section className="room">
        <h2>{t('class.choose_reformer')}</h2>
        <p className="hint">
          {t('class.free_of_total', { free: free, total: spots.length })}
          {full && waitingCount > 0 && t('class.waiting_count', { count: waitingCount })}
        </p>

        <form action={hasLiveOffer ? claim : book}>
          <input type="hidden" name="sessionId" value={session.id} />
          {hasLiveOffer && <input type="hidden" name="entryId" value={entry.id} />}

          <div className="mirror">{t('class.mirror')}</div>
          <div className="grid">
            {rows.map((row) => (
              <div className="row" key={row}>
                {spots.filter((s) => s.row === row).map((s) => (
                  <label
                    key={s.reformerId}
                    className={`spot ${s.status}`}
                    title={
                      s.status === 'free'
                        ? t('class.free')
                        : s.status === 'taken'
                          ? t('class.taken')
                          : t('class.not_available')
                    }
                  >
                    <input
                      type="radio"
                      name="reformerId"
                      value={s.reformerId}
                      disabled={s.status !== 'free'}
                    />
                    <span>{s.label.replace('Reformer ', '')}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <ul className="legend">
            <li><i className="free" /> {t('class.free')}</li>
            <li><i className="taken" /> {t('class.taken')}</li>
            <li><i className="blocked" /> {t('class.maintenance')}</li>
          </ul>

          {!user && (
            <p className="note">
              {t('class.sign_in_to_book')}{' '}
              <Link href={`/login?next=/buchen/${session.id}`}>{t('class.sign_in_word')}</Link>.
            </p>
          )}
          {user && !abo && (
            // It used to be a dead end: the button was disabled with
            // no hint of where to go next. Now the next step is right
            // where someone gets stuck.
            <p className="note">
              {t('class.no_pass')} <Link href="/abos">{t('class.order_pass')}</Link>.
            </p>
          )}
          {user && abo && (
            <p className="note">
              {t('class.credits_row', {
                count: abo.creditsRemaining,
                date: shortDateLabel(abo.expiresAt, lang),
              })}
            </p>
          )}

          {/*
            A full class has no booking button. It used to sit there
            greyed out, together with the cancellation rule — a button
            that cannot be pressed, and a rule that applies to nothing.
            The next step here is the waitlist, which is directly
            below; the grey button only drew attention away from it.
          */}
          {(!full || hasLiveOffer) && (
            <>
              <button
                className="btn"
                type="submit"
                disabled={hasLiveOffer ? !abo : !canBook}
              >
                {hasLiveOffer ? t('class.take_spot') : t('class.confirm_booking')}
              </button>
              <p className="fineprint">
                {t('class.cancellation_rule', { hours: settings.cancellationHours })}
              </p>
            </>
          )}
        </form>
      </section>

      {/* The waitlist: shown only when the class really is full. */}
      {full && !isPast && session.status !== 'cancelled' && !closure && (
        <section className="waitlist">
          <h2>{t('class.waitlist')}</h2>

          {!user && (
            <p className="note">
              {t('class.sign_in_to_join')}{' '}
              <Link href={`/login?next=/buchen/${session.id}`}>{t('class.sign_in_word')}</Link>.
            </p>
          )}

          {canJoin && (
            <>
              <p className="hint">
                {t('class.waitlist_explain_before')} <strong>{windowLabel}</strong>{' '}
                {t('class.waitlist_explain_after')}
              </p>
              <form action={joinList}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button className="btn ghost" type="submit">{t('class.join_waitlist')}</button>
              </form>
            </>
          )}

          {entry && (
            <>
              <p className="hint">
                {entry.status === 'offered'
                  ? hasLiveOffer
                    ? t('class.your_turn')
                    : t('class.offer_expired')
                  : t('class.position_row', { position: entry.position, total: waitingCount })}
              </p>
              <form action={leaveList}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="entryId" value={entry.id} />
                <button className="btn ghost" type="submit">{t('class.leave_waitlist')}</button>
              </form>
            </>
          )}
        </section>
      )}
    </main>
  )
}
