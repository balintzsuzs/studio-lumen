import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getOccupancy } from '@/lib/booking'
import { languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator } from '@/lib/i18n'
import {
  calendarView, dayKeyOrToday, calendarQuery, dayKey, addDays, today,
} from '@/lib/calendar'
import {
  attendanceText, tariffTags, type Participant,
} from '@/lib/participant'
import { isDictionaryKey, type DictionaryKey } from '@/lib/i18n'
import Calendar, { type CalendarEvent } from '../components/Calendar'
import { AUTO_CLOSE_HOURS } from '@/lib/attendance'
import { maybeTick } from '@/lib/waitlist'
import { logout } from '../login/actions'
import { addLesson } from './actions'

export const dynamic = 'force-dynamic'

type Search = Promise<{
  ansicht?: string; datum?: string
  fehler?: string; tag?: string; zeit?: string; geloescht?: string
}>

/**
 * The studio view, with a calendar.
 *
 * Every instructor sees EVERY class, not only their own: four of them
 * teach and they cover for each other, and whoever steps in needs to
 * know beforehand who is coming. The register itself is on the class's
 * own page.
 *
 * The badge here shows how full a class is (`3/5`), not how many spots
 * are free — an instructor cares how many people are coming, not how
 * much room is left.
 */
export default async function Teaching({ searchParams }: { searchParams: Search }) {
  const { ansicht, datum, fehler, tag: day, zeit: time, geloescht } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/unterricht')
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = translator(lang)
  const payload = await getPayload({ config })

  // Closing finished classes and the waitlist get their beat here: the
  // instructor opens this page every day anyway.
  await maybeTick(payload)

  const view = calendarView(ansicht)
  const anchor = dayKeyOrToday(datum)
  const { from, to } = calendarQuery(view, anchor)

  /*
   * The form defaults to the day being viewed — unless that is today
   * or earlier: today's 09:00 has most likely passed, and the form
   * would come straight back with an error. In that case we suggest
   * tomorrow.
   */
  const baseDay = anchor > today() ? anchor : addDays(today(), 1)

  // The dropdowns for creating a class — admin only.
  const admin = user.role === 'admin'
  const [types, studios, instructors] = admin
    ? await Promise.all([
        payload.find({ collection: 'class-types', limit: 20, depth: 0, sort: 'name' }),
        payload.find({ collection: 'studios', limit: 10, depth: 0, sort: 'city' }),
        payload.find({
          collection: 'users',
          where: { role: { in: ['instructor', 'admin'] } },
          limit: 50, depth: 0, sort: 'fullName',
        }),
      ])
    : [null, null, null]

  const sessions = await payload.find({
    collection: 'sessions',
    where: {
      and: [
        { startsAt: { greater_than_equal: from } },
        { startsAt: { less_than: to } },
      ],
    },
    sort: 'startsAt', limit: 300, depth: 1,
  })
  const lessons = sessions.docs as any[]

  const occupancy = await getOccupancy(
    payload,
    lessons.map((s) => ({ id: s.id, studio: s.studio })),
  )

  /*
   * One booking query for everything: the participants' names, the
   * headcount, and the summary for finished classes. depth 2, because
   * the pass's TYPE (its name, its credits) is needed too — at one
   * level only an id would come back.
   *
   * For finished classes both those who attended and those who did not
   * count towards the headcount; `getTeltseg` looks only at active
   * bookings, which after a class would already be zero.
   */
  const COUNTED = ['booked', 'attended', 'no_show'] as const
  const bookings = lessons.length
    ? await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { session: { in: lessons.map((s) => s.id) } },
            { status: { in: [...COUNTED] } },
          ],
        },
        sort: 'bookedAt', limit: 2000, depth: 2,
      })
    : { docs: [] as any[] }

  const STATUS_KEYS: Record<string, DictionaryKey> = {
    attended: 'lesson.status_attended',
    no_show: 'lesson.status_no_show',
  }

  const participantsPerLesson = new Map<number, Participant[]>()
  const headcountPerLesson = new Map<number, number>()
  for (const b of bookings.docs as any[]) {
    const sid = typeof b.session === 'object' ? b.session.id : b.session
    headcountPerLesson.set(sid, (headcountPerLesson.get(sid) ?? 0) + 1)
    const k = b.customer
    const statusKey = STATUS_KEYS[b.status]
    const list = participantsPerLesson.get(sid) ?? []
    list.push({
      id: b.id,
      name: [k?.firstName, k?.lastName].filter(Boolean).join(' ') || '—',
      reformer: b.reformer?.label ?? undefined,
      abo: attendanceText(b, t),
      tags: tariffTags(k, t),
      health: k?.healthNotes || undefined,
      status: isDictionaryKey(statusKey) ? t(statusKey) : undefined,
      href: k?.id ? `/kunden/${k.id}` : undefined,
    })
    participantsPerLesson.set(sid, list)
  }

  const now = Date.now()
  const events: CalendarEvent[] = lessons.map((s) => {
    const past = new Date(s.startsAt).getTime() <= now
    const tt = occupancy.get(s.id)
    const headcount = headcountPerLesson.get(s.id) ?? 0
    return {
      id: s.id,
      start: s.startsAt,
      day: dayKey(s.startsAt),
      minutes: s.durationMinutes,
      title: s.classType?.name ?? '',
      also: [s.instructor?.firstName, s.studio?.city].filter(Boolean).join(' · '),
      third: languageLabel(s) || undefined,
      marker: tt ? `${headcount}/${tt.capacity}` : undefined,
      full: Boolean(tt && tt.capacity > 0 && headcount >= tt.capacity),
      cancelled: s.status === 'cancelled',
      button: t('calendar.open'),
      participants: participantsPerLesson.get(s.id),
      href: `/unterricht/${s.id}`,
    }
  })

  return (
    <main className="shell wide">
      <header className="page-head">
        <h1>{t('teaching.title')}</h1>
        <div className="who">
          {user.firstName} · <Link href="/kunden">{t('customer.customers')}</Link> ·{' '}
          <Link href="/konto">{t('common.my_account')}</Link> ·{' '}
          <form action={logout} style={{ display: 'inline' }}>
            <button type="submit" className="linkish">{t('common.sign_out_lower')}</button>
          </form>
        </div>
      </header>

      <p className="lead">{t('teaching.lead_admin')}</p>
      {/* In the old list this sat above the finished classes. The
          calendar needs it too: without it there is no hint of where
          attendance can be recorded. */}
      <p className="hint">{t('teaching.past_hint', { hours: AUTO_CLOSE_HOURS })}</p>

      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      {geloescht && <p className="ok">{t('newclass.deleted')}</p>}

      {admin && types && studios && instructors && (
        /* A collapsible block rather than a permanently open form:
           the page is primarily the calendar, and creating a class is
           a rare operation. */
        <details className="newlesson">
          <summary>{t('newclass.open')}</summary>
          <p className="hint">{t('newclass.hint')}</p>
          <form action={addLesson} className="formgrid">
            <label>
              {t('newclass.date')}
              <input type="date" name="day" required defaultValue={day ?? baseDay} min={today()} />
            </label>
            <label>
              {t('newclass.time')}
              <input type="time" name="time" required defaultValue={time ?? '09:00'} step={300} />
            </label>
            <label>
              {t('newclass.duration')}
              <input type="number" name="minutes" required defaultValue={60} min={15} max={300} step={5} />
            </label>
            <label>
              {t('newclass.class_type')}
              <select name="classType" required>
                {(types.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('newclass.studio')}
              <select name="studio" required>
                {(studios.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>{x.city}</option>
                ))}
              </select>
            </label>
            <label>
              {t('newclass.instructor')}
              <select name="instructor" required>
                {(instructors.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>
                    {[x.firstName, x.lastName].filter(Boolean).join(' ') || x.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('newclass.language')}
              <select name="lang" defaultValue="auto">
                <option value="auto">{t('newclass.language_auto')}</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="full-width">
              {t('newclass.note')}
              <input type="text" name="note" />
            </label>
            <div className="full-width">
              <button className="btn" type="submit">{t('newclass.button')}</button>
            </div>
          </form>
        </details>
      )}

      <Calendar
        view={view}
        anchor={anchor}
        events={events}
        lang={lang}
        base="/unterricht"
      />
    </main>
  )
}
