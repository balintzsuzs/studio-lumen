import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'
import { getCurrentUser } from '@/lib/auth'
import { maybeTick } from '@/lib/waitlist'
import { getOccupancy } from '@/lib/booking'
import { languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator } from '@/lib/i18n'
import { calendarView, dayKeyOrToday, calendarQuery, dayKey } from '@/lib/calendar'
import Calendar, { type CalendarEvent } from '../components/Calendar'

export const dynamic = 'force-dynamic'

type Search = Promise<{ studio?: string; ansicht?: string; datum?: string }>

export default async function Schedule({ searchParams }: { searchParams: Search }) {
  const { studio, ansicht, datum } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  const lang = await getLang(user)
  const t = translator(lang)

  // Expiring and issuing waitlist offers gets its beat here, because
  // on Vercel's free plan the cron runs only once a day.
  await maybeTick(payload)

  const view = calendarView(ansicht)
  const anchor = dayKeyOrToday(datum)
  const { from, to } = calendarQuery(view, anchor)

  const studios = await payload.find({ collection: 'studios', limit: 10, depth: 0, sort: 'city' })

  /*
   * The calendar queries the period being displayed, not "the next
   * hundred". Cancelled and finished classes are included too, just
   * dimmed — otherwise a customer would hunt in vain for a class that
   * seems to have vanished.
   */
  const and: Where[] = [
    { startsAt: { greater_than_equal: from } },
    { startsAt: { less_than: to } },
  ]
  if (studio) and.push({ studio: { equals: Number(studio) } })

  const sessions = await payload.find({
    collection: 'sessions', where: { and }, sort: 'startsAt', limit: 300, depth: 1,
  })
  const lessons = sessions.docs as any[]

  const occupancy = await getOccupancy(
    payload,
    lessons.map((s) => ({ id: s.id, studio: s.studio })),
  )

  /*
   * For an instructor or an admin the schedule is not a booking
   * screen: they are not looking for a spot, they are looking at who
   * is coming. So the rows lead into the studio view — the same class,
   * seen from the side that matches their job.
   */
  const staff = user?.role === 'instructor' || user?.role === 'admin'

  const now = Date.now()
  const events: CalendarEvent[] = lessons.map((s) => {
    const tt = occupancy.get(s.id)
    const past = new Date(s.startsAt).getTime() <= now
    const cancelled = s.status === 'cancelled'
    return {
      id: s.id,
      start: s.startsAt,
      day: dayKey(s.startsAt),
      minutes: s.durationMinutes,
      title: s.classType?.name ?? '',
      also: [s.instructor?.firstName, s.studio?.city].filter(Boolean).join(' · '),
      third: languageLabel(s) || undefined,
      marker:
        cancelled || !tt
          ? undefined
          : tt.free === 0
            ? t('calendar.fully_booked')
            : t('calendar.free_count', { count: tt.free }),
      full: Boolean(tt && tt.free === 0) && !cancelled,
      cancelled: cancelled || past,
      // There is nothing to book on a cancelled or finished class, and
      // the button would only mislead.
      button: staff
        ? t('calendar.open')
        : cancelled || past ? undefined : t('calendar.book'),
      href: staff ? `/unterricht/${s.id}` : `/buchen/${s.id}`,
    }
  })

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('schedule.eyebrow')}</p>
          <h1>{t('schedule.title')}</h1>
        </div>
        <p className="who">
          {user
            ? <>{t('schedule.signed_in_as', { name: user.firstName ?? '' })} · <Link href="/konto">{t('common.my_account')}</Link></>
            : <Link href="/login">{t('common.sign_in')}</Link>}
        </p>
      </header>

      <nav className="filters">
        <Link
          className={!studio ? 'chip on' : 'chip'}
          href={`/buchen?ansicht=${view}&datum=${anchor}`}
        >
          {t('schedule.all_studios')}
        </Link>
        {(studios.docs as any[]).map((s) => (
          <Link
            key={s.id}
            className={String(s.id) === studio ? 'chip on' : 'chip'}
            href={`/buchen?studio=${s.id}&ansicht=${view}&datum=${anchor}`}
          >
            {s.city}
          </Link>
        ))}
      </nav>

      <Calendar
        view={view}
        anchor={anchor}
        events={events}
        lang={lang}
        base="/buchen"
        extra={{ studio }}
      />
    </main>
  )
}
