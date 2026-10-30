import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/booking'
import { dayLabel, timeLabel, shortDateLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs, type SzotarKulcs } from '@/lib/i18n'
import { cancel } from './actions'
import { logout } from '../login/actions'

export const dynamic = 'force-dynamic'

const ALLAPOT_KULCS: Record<string, SzotarKulcs> = {
  booked: 'oktora.status_booked',
  attended: 'oktora.status_attended',
  no_show: 'oktora.status_no_show',
}


export default async function Konto({
  searchParams,
}: { searchParams: Promise<{ gebucht?: string; storniert?: string; fehler?: string }> }) {
  const { gebucht, storniert, fehler } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/konto')

  const lang = await getLang(user)
  const t = forditó(lang)

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
          <p className="eyebrow">{t('konto.eyebrow')}</p>
          <h1>{user.firstName} {user.lastName}</h1>
        </div>
        <div className="who">
          <Link href="/buchen">{t('kozos.stundenplan')}</Link>
          <span aria-hidden="true"> · </span>
          {(user.role === 'instructor' || user.role === 'admin') && (
            <>
              <Link href="/unterricht">{t('kozos.unterricht')}</Link>
              <span aria-hidden="true"> · </span>
            </>
          )}
          <form action={logout}>
            <button className="linklike" type="submit">{t('kozos.abmelden')}</button>
          </form>
        </div>
      </header>

      {gebucht && <p className="ok">{t('konto.gebucht')}</p>}
      {storniert === 'gutgeschrieben' && <p className="ok">{t('konto.storno_jovairva')}</p>}
      {storniert === 'verfallen' && (
        <p className="alert">{t('konto.storno_elveszett', { ora: cancellationHours })}</p>
      )}
      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}

      <section>
        <h2>{t('konto.abos')}</h2>
        {abos.totalDocs === 0 && <p className="empty">{t('konto.nincs_abo')}</p>}
        <ul className="cards">
          {(abos.docs as any[]).map((a) => (
            <li key={a.id}>
              <strong>{a.aboType?.name}</strong>
              <span>{a.creditsRemaining} {t('kozos.guthaben')}</span>
              <span className="muted">
                {t('kozos.gueltig_bis')} {shortDateLabel(a.expiresAt, lang)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{t('konto.kovetkezo_orak')}</h2>
        {upcoming.length === 0 && <p className="empty">{t('konto.nincs_foglalas')}</p>}
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
                    {freeCancel ? t('konto.stornieren') : t('konto.stornieren_elveszik')}
                  </button>
                </form>
              </li>
            )
          })}
        </ul>
      </section>

      {past.length > 0 && (
        <section>
          <h2>{t('konto.verlauf')}</h2>
          <ul className="bookings past">
            {past.slice(0, 10).map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{dayLabel(b.session?.startsAt, lang)}, {timeLabel(b.session?.startsAt, lang)}</strong>
                  <span className="muted">
                    {b.session?.classType?.name} · {b.session?.studio?.city} ·{' '}
                    {/* A nyers állapotnév angolul van az adatbázisban
                        („attended"), a vendég viszont a saját nyelvén
                        olvassa a lapot. Lefordítjuk. */}
                    {b.status === 'cancelled'
                      ? (b.creditRefunded ? t('konto.storno_gut') : t('konto.storno_verfallen'))
                      : ALLAPOT_KULCS[b.status]
                        ? t(ALLAPOT_KULCS[b.status])
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
