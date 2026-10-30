import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Where } from 'payload'
import { getCurrentUser } from '@/lib/auth'
import { maybeTick } from '@/lib/waitlist'
import { getTeltseg } from '@/lib/booking'
import { languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó } from '@/lib/i18n'
import { naptarMod, napKulcsVagyMa, naptarLekerdezes, napKulcs } from '@/lib/naptar'
import Naptar, { type NaptarEsemeny } from '../components/Naptar'

export const dynamic = 'force-dynamic'

type Search = Promise<{ studio?: string; ansicht?: string; datum?: string }>

export default async function Schedule({ searchParams }: { searchParams: Search }) {
  const { studio, ansicht, datum } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  const lang = await getLang(user)
  const t = forditó(lang)

  // Expiring and issuing waitlist offers gets its beat here, because
  // on Vercel's free plan the cron runs only once a day.
  await maybeTick(payload)

  const mod = naptarMod(ansicht)
  const horgony = napKulcsVagyMa(datum)
  const { tol, ig } = naptarLekerdezes(mod, horgony)

  const studios = await payload.find({ collection: 'studios', limit: 10, depth: 0, sort: 'city' })

  /*
   * The calendar queries the period being displayed, not "the next
   * hundred". Cancelled and finished classes are included too, just
   * dimmed — otherwise a customer would hunt in vain for a class that
   * seems to have vanished.
   */
  const and: Where[] = [
    { startsAt: { greater_than_equal: tol } },
    { startsAt: { less_than: ig } },
  ]
  if (studio) and.push({ studio: { equals: Number(studio) } })

  const sessions = await payload.find({
    collection: 'sessions', where: { and }, sort: 'startsAt', limit: 300, depth: 1,
  })
  const orak = sessions.docs as any[]

  const teltseg = await getTeltseg(
    payload,
    orak.map((s) => ({ id: s.id, studio: s.studio })),
  )

  /*
   * For an instructor or an admin the schedule is not a booking
   * screen: they are not looking for a spot, they are looking at who
   * is coming. So the rows lead into the studio view — the same class,
   * seen from the side that matches their job.
   */
  const stab = user?.role === 'instructor' || user?.role === 'admin'

  const most = Date.now()
  const esemenyek: NaptarEsemeny[] = orak.map((s) => {
    const tt = teltseg.get(s.id)
    const elmult = new Date(s.startsAt).getTime() <= most
    const lemondva = s.status === 'cancelled'
    return {
      id: s.id,
      kezdet: s.startsAt,
      nap: napKulcs(s.startsAt),
      perc: s.durationMinutes,
      cim: s.classType?.name ?? '',
      also: [s.instructor?.firstName, s.studio?.city].filter(Boolean).join(' · '),
      harmadik: languageLabel(s) || undefined,
      jeloles:
        lemondva || !tt
          ? undefined
          : tt.szabad === 0
            ? t('naptar.ausgebucht')
            : t('naptar.frei', { db: tt.szabad }),
      telt: Boolean(tt && tt.szabad === 0) && !lemondva,
      lemondva: lemondva || elmult,
      // There is nothing to book on a cancelled or finished class, and
      // the button would only mislead.
      gomb: stab
        ? t('naptar.ansehen')
        : lemondva || elmult ? undefined : t('naptar.buchen'),
      href: stab ? `/unterricht/${s.id}` : `/buchen/${s.id}`,
    }
  })

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('buchen.eyebrow')}</p>
          <h1>{t('buchen.cim')}</h1>
        </div>
        <p className="who">
          {user
            ? <>{t('buchen.angemeldet_als', { nev: user.firstName ?? '' })} · <Link href="/konto">{t('kozos.mein_konto')}</Link></>
            : <Link href="/login">{t('kozos.anmelden')}</Link>}
        </p>
      </header>

      <nav className="filters">
        <Link
          className={!studio ? 'chip on' : 'chip'}
          href={`/buchen?ansicht=${mod}&datum=${horgony}`}
        >
          {t('buchen.alle_studios')}
        </Link>
        {(studios.docs as any[]).map((s) => (
          <Link
            key={s.id}
            className={String(s.id) === studio ? 'chip on' : 'chip'}
            href={`/buchen?studio=${s.id}&ansicht=${mod}&datum=${horgony}`}
          >
            {s.city}
          </Link>
        ))}
      </nav>

      <Naptar
        mod={mod}
        horgony={horgony}
        esemenyek={esemenyek}
        lang={lang}
        alap="/buchen"
        extra={{ studio }}
      />
    </main>
  )
}
