import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAvailability, isClosed, findUsableAbo, getSettings } from '@/lib/booking'
import { getMyEntry, countWaiting, offerMinutesFor, maybeTick } from '@/lib/waitlist'
import { getCurrentUser } from '@/lib/auth'
import { dayLabel, timeLabel, dateTimeLabel, shortDateLabel, languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs } from '@/lib/i18n'
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
  const t = forditó(lang)
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
      ? `${Math.round(windowMinutes / 60)} ${t('kozos.stunden')}`
      : `${windowMinutes} ${t('kozos.minuten')}`

  const canBook = Boolean(user && abo && free > 0 && !closure && !isPast)
  const canJoin = Boolean(user && full && !closure && !isPast && !entry)

  return (
    <main className="shell">
      <p className="back"><Link href="/buchen">{t('kozos.stundenplan_vissza')}</Link></p>

      <p className="eyebrow">{session.studio?.city}</p>
      <h1>{session.classType?.name}</h1>
      <p className="lead">
        {dayLabel(session.startsAt, lang)}, {timeLabel(session.startsAt, lang)}
        {lang === 'de' ? ' Uhr' : ''} ·{' '}
        {session.durationMinutes} {t('kozos.minuten')} · {session.instructor?.firstName}
        {languageLabel(session) && ` · ${languageLabel(session)}`}
      </p>

      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      {warteliste && (
        <p className="ok">{t('ora.warteliste_pozicio', { pozicio: warteliste })}</p>
      )}
      {abgemeldet && <p className="ok">{t('ora.abgemeldet')}</p>}
      {closure && <p className="alert">{t('ora.zarva', { ok: closure })}</p>}
      {session.status === 'cancelled' && (
        <p className="alert">
          {t('ora.lemondva', {
            ok: session.cancellationReason ? `: ${session.cancellationReason}` : '.',
          })}
        </p>
      )}
      {isPast && session.status !== 'cancelled' && (
        <p className="alert">{t('ora.mar_elkezdodott')}</p>
      )}

      {hasLiveOffer && (
        <section className="offer">
          <h2>{t('ora.ajanlat_cim')}</h2>
          <p className="hint">
            {t('ora.ajanlat_szoveg_elott')}{' '}
            <strong>{dateTimeLabel(entry.offerExpiresAt, lang)}</strong>
            {t('ora.ajanlat_szoveg_utan')}
          </p>
        </section>
      )}

      <section className="room">
        <h2>{t('ora.geraet_waehlen')}</h2>
        <p className="hint">
          {t('ora.szabad_kesz', { szabad: free, osszes: spots.length })}
          {full && waitingCount > 0 && t('ora.varolistan_allnak', { db: waitingCount })}
        </p>

        <form action={hasLiveOffer ? claim : book}>
          <input type="hidden" name="sessionId" value={session.id} />
          {hasLiveOffer && <input type="hidden" name="entryId" value={entry.id} />}

          <div className="mirror">{t('ora.spiegel')}</div>
          <div className="grid">
            {rows.map((row) => (
              <div className="row" key={row}>
                {spots.filter((s) => s.row === row).map((s) => (
                  <label
                    key={s.reformerId}
                    className={`spot ${s.status}`}
                    title={
                      s.status === 'free'
                        ? t('ora.frei')
                        : s.status === 'taken'
                          ? t('ora.belegt')
                          : t('ora.nem_elerheto')
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
            <li><i className="free" /> {t('ora.frei')}</li>
            <li><i className="taken" /> {t('ora.belegt')}</li>
            <li><i className="blocked" /> {t('ora.wartung')}</li>
          </ul>

          {!user && (
            <p className="note">
              {t('ora.foglalashoz_belepes')}{' '}
              <Link href={`/login?next=/buchen/${session.id}`}>{t('ora.belepes_szo')}</Link>.
            </p>
          )}
          {user && !abo && (
            // It used to be a dead end: the button was disabled with
            // no hint of where to go next. Now the next step is right
            // where someone gets stuck.
            <p className="note">
              {t('ora.nincs_abo')} <Link href="/abos">{t('ora.abo_bestellen')}</Link>.
            </p>
          )}
          {user && abo && (
            <p className="note">
              {t('ora.guthaben_sor', {
                db: abo.creditsRemaining,
                datum: shortDateLabel(abo.expiresAt, lang),
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
                {hasLiveOffer ? t('ora.platz_uebernehmen') : t('ora.verbindlich_buchen')}
              </button>
              <p className="fineprint">
                {t('ora.storno_szabaly', { ora: settings.cancellationHours })}
              </p>
            </>
          )}
        </form>
      </section>

      {/* The waitlist: shown only when the class really is full. */}
      {full && !isPast && session.status !== 'cancelled' && !closure && (
        <section className="waitlist">
          <h2>{t('ora.warteliste')}</h2>

          {!user && (
            <p className="note">
              {t('ora.feliratkozashoz_belepes')}{' '}
              <Link href={`/login?next=/buchen/${session.id}`}>{t('ora.belepes_szo')}</Link>.
            </p>
          )}

          {canJoin && (
            <>
              <p className="hint">
                {t('ora.varolista_magyarazat_elott')} <strong>{windowLabel}</strong>{' '}
                {t('ora.varolista_magyarazat_utan')}
              </p>
              <form action={joinList}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button className="btn ghost" type="submit">{t('ora.varolistara')}</button>
              </form>
            </>
          )}

          {entry && (
            <>
              <p className="hint">
                {entry.status === 'offered'
                  ? hasLiveOffer
                    ? t('ora.sorra_kerultel')
                    : t('ora.ajanlat_lejart')
                  : t('ora.pozicio_sor', { pozicio: entry.position, osszes: waitingCount })}
              </p>
              <form action={leaveList}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="entryId" value={entry.id} />
                <button className="btn ghost" type="submit">{t('ora.varolistarol_le')}</button>
              </form>
            </>
          )}
        </section>
      )}
    </main>
  )
}
