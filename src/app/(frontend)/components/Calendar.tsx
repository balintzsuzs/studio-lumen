import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { translator, type DictionaryKey } from '@/lib/i18n'
import {
  calendarDays, calendarStep, sameMonth, monthStart, today, type CalendarView,
} from '@/lib/calendar'
import { dayNameShort, dayName, dayAndMonth, monthAndYear, timeLabel } from '@/lib/format'
import type { Participant } from '@/lib/participant'

/**
 * Calendar: day, week, month — the same component on the schedule and
 * on the studio's side.
 *
 * Built around the day. The month at the top, below it a horizontal
 * date strip with the selected day highlighted; under that, the day's
 * classes stacked in readable rows. The week and month views use the
 * same rows, just across more days.
 *
 * The component knows nothing about the database. The page assembles
 * the events and the calendar only lays them out — so one structure
 * serves both the customer and the instructor, even though they put
 * different things in the rows.
 *
 * The view and the date live in the URL (`?ansicht=…&datum=…`), not in
 * state: shareable, works with the back button, and survives a reload.
 */

export type CalendarEvent = {
  id: number
  /** Start time, ISO. */
  start: string
  day: string
  /** Duration in minutes, for the bottom line of the left column. */
  minutes?: number
  title: string
  /** "Elin · Zürich" — who teaches it and where. */
  also?: string
  /** A third line, if any: language, note. */
  third?: string
  /** Short status: "5 frei", "ausgebucht", "3/5". */
  marker?: string
  full?: boolean
  cancelled?: boolean
  /** The button's label; without one, no button is rendered. */
  button?: string
  /**
   * Who is coming. Only filled in on the studio's side: there the
   * class on its own says little, and it is the names the instructor
   * cares about.
   */
  participants?: Participant[]
  href: string
}

type Props = {
  view: CalendarView
  anchor: string
  events: CalendarEvent[]
  lang: Lang
  base: string
  extra?: Record<string, string | undefined>
}

const VIEW_KEYS: Record<CalendarView, DictionaryKey> = {
  tag: 'calendar.day',
  woche: 'calendar.week',
  monat: 'calendar.month',
}

export default function Calendar({ view, anchor, events, lang, base, extra }: Props) {
  const t = translator(lang)
  const todayKey = today()

  const link = (p: { view?: CalendarView; datum?: string }) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(extra ?? {})) if (v) q.set(k, v)
    q.set('ansicht', p.view ?? view)
    q.set('datum', p.datum ?? anchor)
    return `${base}?${q.toString()}`
  }

  const dayEvents = (day: string) =>
    events.filter((e) => e.day === day).sort((a, b) => a.start.localeCompare(b.start))

  /** The date strip always shows the week of the selected day. */
  const stripDays = calendarDays('woche', anchor)

  /** Paging the strip: by a week, even when the month view is active. */
  const stripStep = (direction: 1 | -1) =>
    link({ datum: calendarStep('woche', anchor, direction) })

  const headerLabel =
    view === 'monat'
      ? monthAndYear(anchor, lang)
      : view === 'woche'
        ? `${dayAndMonth(stripDays[0], lang)} – ${dayAndMonth(stripDays[6], lang)}`
        : monthAndYear(anchor, lang)

  /** One class's row. The same in every view, only denser in the month grid. */
  const row = (e: CalendarEvent, compact = false) => (
    <li key={e.id} className={`lesson-row${e.cancelled ? ' cancelled' : ''}${compact ? ' compact' : ''}`}>
      <div className="lesson-time">
        <span className="clock">{timeLabel(e.start, lang)}</span>
        {e.minutes && !compact && <span className="duration">{e.minutes} {t('common.min_short')}</span>}
      </div>

      <div className="lesson-body">
        <Link href={e.href} className="lesson-title">{e.title}</Link>
        {e.also && <p className="lesson-bottom">{e.also}</p>}
        {e.third && !compact && <p className="lesson-third">{e.third}</p>}
      </div>

      <div className="lesson-right">
        {e.marker && (
          <span className={`lesson-marker${e.full ? ' full' : ''}`}>{e.marker}</span>
        )}
        {e.button && !compact && (
          <Link href={e.href} className="btn lesson-button">{e.button}</Link>
        )}
      </div>

      {e.participants && e.participants.length > 0 && (
        <ul className="participants">
          {e.participants.map((r) => (
            <li key={r.id} className={r.status ? 'faint' : undefined}>
              {r.href
                ? <Link href={r.href} className="r-name">{r.name}</Link>
                : <span className="r-name">{r.name}</span>}
              {r.reformer && <span className="r-reformer">{r.reformer}</span>}
              {r.abo && <span className="r-abo">{r.abo}</span>}
              {r.status && <span className="r-status">{r.status}</span>}
              {r.tags.length > 0 && (
                <span className="r-tag">{r.tags.join(' · ')}</span>
              )}
              {r.health && (
                <span className="r-health">
                  {t('lesson.health')}: {r.health}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )

  const dayBlock = (day: string, header = true) => {
    const list = dayEvents(day)
    return (
      <div key={day} className="calendar-dayblock">
        {header && (
          <h3 className={day === todayKey ? 'today' : undefined}>
            {dayName(day, lang)}, {dayAndMonth(day, lang)}
          </h3>
        )}
        {list.length === 0 ? (
          <p className="empty">{t('calendar.no_classes')}</p>
        ) : (
          <ul className="lesson-list">{list.map((e) => row(e))}</ul>
        )}
      </div>
    )
  }

  return (
    <section className="calendar">
      {/* --- header: the month and the view switcher --- */}
      <header className="calendar-head">
        <h2 className="calendar-monthname">{headerLabel}</h2>
        <nav className="calendar-views" aria-label={t('calendar.view')}>
          {(['tag', 'woche', 'monat'] as CalendarView[]).map((m) => (
            <Link
              key={m}
              href={link({ view: m })}
              className={`view${m === view ? ' on' : ''}`}
              aria-current={m === view ? 'page' : undefined}
            >
              {t(VIEW_KEYS[m])}
            </Link>
          ))}
        </nav>
      </header>

      {/* --- date strip: the days of the week, in circles --- */}
      <div className="date-strip">
        <Link href={stripStep(-1)} className="strip-arrow" aria-label={t('calendar.previous')}>‹</Link>

        <ol className="strip-days">
          {stripDays.map((day) => {
            const hasLesson = dayEvents(day).length > 0
            const selected = day === anchor && view !== 'monat'
            return (
              <li key={day}>
                <Link
                  /* Clicking a specific day means I want to see that
                     day, not its week. The toggle above is there for
                     the week and month views — this strip is about
                     days. */
                  href={link({ view: 'tag', datum: day })}
                  className={`strip-day${selected ? ' on' : ''}${day === todayKey ? ' today' : ''}`}
                  aria-current={selected ? 'date' : undefined}
                >
                  <span className="strip-letter">{dayNameShort(day, lang)}</span>
                  <span className="strip-number">{Number(day.slice(8))}</span>
                  <span className={`strip-dot${hasLesson ? '' : ' blank'}`} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>

        <Link href={stripStep(1)} className="strip-arrow" aria-label={t('calendar.next')}>›</Link>
      </div>

      <p className="calendar-note">
        <Link href={link({ datum: todayKey })} className="today-link">{t('calendar.today')}</Link>
        <span aria-hidden="true"> · </span>
        {t('calendar.timezone')}
      </p>

      {/* --- tartalom --- */}
      {view === 'tag' && <div className="calendar-body">{dayBlock(anchor)}</div>}

      {view === 'woche' && (
        <div className="calendar-body">
          {stripDays.filter((n) => dayEvents(n).length > 0).length === 0 ? (
            <p className="empty">{t('calendar.no_classes')}</p>
          ) : (
            stripDays
              .filter((n) => dayEvents(n).length > 0)
              .map((day) => dayBlock(day))
          )}
        </div>
      )}

      {view === 'monat' && (
        <div className="calendar-body">
          {calendarDays('monat', anchor)
            .filter((n) => sameMonth(n, monthStart(anchor)) && dayEvents(n).length > 0)
            .map((day) => dayBlock(day))}
          {calendarDays('monat', anchor).every(
            (n) => !sameMonth(n, monthStart(anchor)) || dayEvents(n).length === 0,
          ) && <p className="empty">{t('calendar.no_classes')}</p>}
        </div>
      )}
    </section>
  )
}
