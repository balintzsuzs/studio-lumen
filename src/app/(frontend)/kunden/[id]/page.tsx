import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { customerProfile, type CustomerLesson } from '@/lib/customer'
import { dayLabel, timeLabel, shortDateLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator, type Translator, type DictionaryKey } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const STATUS_KEYS: Record<string, DictionaryKey> = {
  booked: 'lesson.status_booked',
  attended: 'lesson.status_attended',
  no_show: 'lesson.status_no_show',
  cancelled: 'lesson.status_cancelled',
}

const PASS_STATUS_KEYS: Record<string, DictionaryKey> = {
  pending: 'customer.pass_status_pending',
  active: 'customer.pass_status_active',
  expired: 'customer.pass_status_expired',
  cancelled: 'customer.pass_status_cancelled',
}

const ROLE_KEYS: Record<string, DictionaryKey> = {
  instructor: 'customer.instructor_tag',
  admin: 'customer.admin_tag',
}

/**
 * One class's row in the history. It links to the class's own page
 * rather than into a dead end: from there attendance can also be
 * corrected, if something comes to light afterwards.
 */
const lessonRow = (o: CustomerLesson, t: Translator, lang: 'de' | 'en', withStatus: boolean) => (
  <li key={o.bookingId} className={o.status === 'cancelled' ? 'muted' : undefined}>
    <Link href={`/unterricht/${o.sessionId}`} className="customer-lesson-title">
      {o.title || t('common.class')}
    </Link>
    <span className="customer-lesson-time">
      {dayLabel(o.start, lang)}, {timeLabel(o.start, lang)}
      {lang === 'de' ? ' Uhr' : ''}
    </span>
    <span className="customer-lesson-where">
      {[o.instructor, o.studio, o.reformer].filter(Boolean).join(' · ')}
    </span>
    {withStatus && STATUS_KEYS[o.status] && (
      <span className="tag">
        {t(STATUS_KEYS[o.status])}
        {o.status === 'cancelled' && o.cancellationType === 'late' && t('lesson.cancel_late')}
        {o.status === 'cancelled' && o.cancellationType === 'by_studio' && t('lesson.cancel_studio')}
      </span>
    )}
  </li>
)

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customerId = Number(id)

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/kunden/${customerId}`)
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = translator(lang)
  const payload = await getPayload({ config })

  const p = Number.isFinite(customerId) ? await customerProfile(payload, customerId) : null
  if (!p) notFound()

  const k = p.customer
  const name = [k.firstName, k.lastName].filter(Boolean).join(' ') || k.email
  const st = p.reliability
  const open = p.past.filter((o) => o.status === 'booked').length

  return (
    <main className="shell wide">
      <p className="back"><Link href="/kunden">{t('customer.list_back')}</Link></p>

      <h1>{name}</h1>
      {/* Nothing rather than an empty paragraph: for a customer with no
          markers, the gap under the heading would look like a hole. */}
      {(ROLE_KEYS[k.role] || p.youngMember) && (
        <p className="lead">
          {ROLE_KEYS[k.role] && <span className="tag">{t(ROLE_KEYS[k.role])}</span>}
          {p.youngMember && <span className="tag">{t('lesson.tag_young')}</span>}
        </p>
      )}

      <div className="customer-grid">
        <section className="day">
          <h2>{t('customer.contact_title')}</h2>
          <dl className="datasheet">
            <dt>{t('login.email')}</dt>
            <dd><a href={`mailto:${k.email}`}>{k.email}</a></dd>
            <dt>{t('customer.phone')}</dt>
            <dd>
              {k.phone
                ? <a href={`tel:${k.phone}`}>{k.phone}</a>
                : <span className="faint">{t('customer.no_phone')}</span>}
            </dd>
            {k.birthYear && (
              <>
                <dt>{t('customer.birth_year')}</dt>
                <dd>{k.birthYear}</dd>
              </>
            )}
            <dt>{t('customer.language')}</dt>
            <dd>{k.language === 'en' ? 'English' : 'Deutsch'}</dd>
          </dl>
          {/* Editing happens in the Payload admin: writing one field in
              two places would mean keeping two rules in step. */}
          <p className="hint">
            <Link href={`/admin/collections/users/${k.id}`}>{t('customer.edit_in_admin')}</Link>
          </p>
        </section>

        <section className="day">
          <h2>{t('customer.health_title')}</h2>
          {k.healthNotes
            ? <p className="health-block">{k.healthNotes}</p>
            : <p className="empty">{t('customer.no_health_note')}</p>}
        </section>
      </div>

      <section className="day">
        <h2>{t('customer.passes_title')}</h2>
        {p.passes.length === 0 ? (
          <p className="empty">{t('customer.no_pass')}</p>
        ) : (
          <>
            <p className="hint">{t('customer.credits_total', { count: p.creditsTotal })}</p>
            <ul className="plain">
              {p.passes.map((a: any) => (
                <li key={a.id} className={a.status === 'active' ? undefined : 'muted'}>
                  {a.aboType?.name ?? t('common.class')}
                  {' · '}
                  {a.creditsRemaining === 1
                    ? t('customer.pass_credits_one')
                    : t('customer.pass_credits', { count: a.creditsRemaining ?? 0 })}
                  {a.expiresAt && ` · ${t('common.valid_until')} ${shortDateLabel(a.expiresAt, lang)}`}
                  {PASS_STATUS_KEYS[a.status] && (
                    <span className="tag">{t(PASS_STATUS_KEYS[a.status])}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="day">
        <h2>{t('customer.upcoming_title')}</h2>
        {p.upcoming.length === 0 ? (
          <p className="empty">{t('customer.no_upcoming')}</p>
        ) : (
          <ul className="customer-lessons">
            {p.upcoming.map((o) => lessonRow(o, t, lang, false))}
          </ul>
        )}
      </section>

      <section className="day">
        <h2>{t('customer.past_title')}</h2>
        {p.past.length === 0 ? (
          <p className="empty">{t('customer.no_past')}</p>
        ) : (
          <>
            {/* A past class still marked "gebucht" does not mean the
                person was absent, but that nobody recorded attendance.
                Unless we say so, the zero statistics look like a bug. */}
            {open > 0 && (
              <p className="hint">{t('customer.open_attendance', { count: open })}</p>
            )}
            <p className="hint">
              {t('customer.stats', {
                attended: st.attended, no_show: st.noShows,
                late: st.lateCancels, in_time: st.inTimeCancels,
              })}
            </p>
            <ul className="customer-lessons">
              {p.past.map((o) => lessonRow(o, t, lang, true))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
