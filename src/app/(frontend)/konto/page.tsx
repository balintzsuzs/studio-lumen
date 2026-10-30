import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/booking'
import { dayLabel, timeLabel, shortDateLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey, type DictionaryKey } from '@/lib/i18n'
import { cancel } from './actions'
import { logout } from '../login/actions'

export const dynamic = 'force-dynamic'

const STATUS_KEYS: Record<string, DictionaryKey> = {
  booked: 'lesson.status_booked',
  attended: 'lesson.status_attended',
  no_show: 'lesson.status_no_show',
}


export default async function Account({
  searchParams,
}: { searchParams: Promise<{ gebucht?: string; storniert?: string; fehler?: string }> }) {
  const { gebucht, storniert, fehler } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/konto')

  const lang = await getLang(user)
  const t = translator(lang)

  const payload = await getPayload({ config })
  const { cancellationHours } = await getSettings(payload)

  const abos = await payload.find({
    collection: 'abos',
    where: { and: [{ customer: { equals: user.id } }, { status: { equals: 'active' } }] },
    sort: 'expiresAt', limit: 20, depth: 1,
  })

  const bookings = await payload.find({
    collection: 'bookings',
    where: { customer: { equals: user.id } },
    sort: '-bookedAt', limit: 50, depth: 2,
  })

  const now = Date.now()
  const upcoming = (bookings.docs as any[]).filter(
    (b) => b.status === 'booked' && new Date(b.session?.startsAt).getTime() > now,
  )
  const past = (bookings.docs as any[]).filter((b) => !upcoming.includes(b))

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('account.eyebrow')}</p>
          <h1>{user.firstName} {user.lastName}</h1>
        </div>
        <div className="who">
          <Link href="/buchen">{t('common.schedule')}</Link>
          <span aria-hidden="true"> · </span>
          {(user.role === 'instructor' || user.role === 'admin') && (
            <>
              <Link href="/unterricht">{t('common.teaching')}</Link>
              <span aria-hidden="true"> · </span>
            </>
          )}
          <form action={logout}>
            <button className="linklike" type="submit">{t('common.sign_out')}</button>
          </form>
        </div>
      </header>

      {gebucht && <p className="ok">{t('account.booked')}</p>}
      {storniert === 'gutgeschrieben' && <p className="ok">{t('account.cancel_credited')}</p>}
      {storniert === 'verfallen' && (
        <p className="alert">{t('account.cancel_forfeited', { hours: cancellationHours })}</p>
      )}
      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}

      <section>
        <h2>{t('account.passes')}</h2>
        {abos.totalDocs === 0 && <p className="empty">{t('account.no_pass')}</p>}
        <ul className="cards">
          {(abos.docs as any[]).map((a) => (
            <li key={a.id}>
              <strong>{a.aboType?.name}</strong>
              <span>{a.creditsRemaining} {t('common.credits')}</span>
              <span className="muted">
                {t('common.valid_until')} {shortDateLabel(a.expiresAt, lang)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('account.upcoming_classes')}</h2>
        {upcoming.length === 0 && <p className="empty">{t('account.no_bookings')}</p>}
        <ul className="bookings">
          {upcoming.map((b) => {
            const hoursLeft = (new Date(b.session.startsAt).getTime() - now) / 36e5
            const freeCancel = hoursLeft >= cancellationHours
            return (
              <li key={b.id}>
                <div>
                  <strong>{dayLabel(b.session.startsAt, lang)}, {timeLabel(b.session.startsAt, lang)}</strong>
                  <span className="muted">
                    {b.session.classType?.name} · {b.session.studio?.city}
                    {b.reformer ? ` · ${b.reformer.label}` : ''}
                  </span>
                </div>
                <form action={cancel}>
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="btn ghost small" type="submit">
                    {freeCancel ? t('account.cancel') : t('account.cancel_forfeits')}
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      </section>

      {past.length > 0 && (
        <section>
          <h2>{t('account.history')}</h2>
          <ul className="bookings past">
            {past.slice(0, 10).map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{dayLabel(b.session?.startsAt, lang)}, {timeLabel(b.session?.startsAt, lang)}</strong>
                  <span className="muted">
                    {b.session?.classType?.name} · {b.session?.studio?.city} ·{' '}
                    {/* The raw status name is English in the database
                        ("attended"), but the customer reads the page in
                        their own language. So we translate it. */}
                    {b.status === 'cancelled'
                      ? (b.creditRefunded ? t('account.cancelled_credited') : t('account.cancelled_forfeited'))
                      : STATUS_KEYS[b.status]
                        ? t(STATUS_KEYS[b.status])
                        : b.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
