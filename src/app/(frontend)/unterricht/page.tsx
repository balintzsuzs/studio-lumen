import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getTeltseg } from '@/lib/booking'
import { languageLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó } from '@/lib/i18n'
import {
  naptarMod, napKulcsVagyMa, naptarLekerdezes, napKulcs, napPlusz, ma,
} from '@/lib/naptar'
import {
  reszvetelSzoveg, tarifaJelzesek, type Resztvevo,
} from '@/lib/resztvevo'
import { szotarKulcs, type SzotarKulcs } from '@/lib/i18n'
import Naptar, { type NaptarEsemeny } from '../components/Naptar'
import { AUTO_CLOSE_HOURS } from '@/lib/attendance'
import { maybeTick } from '@/lib/waitlist'
import { logout } from '../login/actions'
import { addLesson } from './actions'

export const dynamic = 'force-dynamic'

type Search = Promise<{
  ansicht?: string; datum?: string
  fehler?: string; nap?: string; ido?: string; geloescht?: string
}>

/**
 * Stúdió nézet, naptárral.
 *
 * Minden oktató MINDEN órát látja, nem csak a sajátját: négyen tartják
 * az órákat és beugranak egymás helyett, és aki beugrik, annak óra előtt
 * tudnia kell, ki jön. A jelenléti lista az óra saját oldalán van.
 *
 * A doboz jelzése itt a telítettség (`3/5`), nem a szabad hely — az
 * oktatót az érdekli, hányan jönnek, nem az, hány hely maradt.
 */
export default async function Unterricht({ searchParams }: { searchParams: Search }) {
  const { ansicht, datum, fehler, nap, ido, geloescht } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/unterricht')
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = forditó(lang)
  const payload = await getPayload({ config })

  // A lement órák lezárása és a várólista itt kap ütemet: az oktató
  // amúgy is naponta megnyitja ezt a lapot.
  await maybeTick(payload)

  const mod = naptarMod(ansicht)
  const horgony = napKulcsVagyMa(datum)
  const { tol, ig } = naptarLekerdezes(mod, horgony)

  /*
   * Az űrlap alapértelmezett napja a nézett nap — kivéve, ha az ma van
   * vagy korábbi: a mai 09:00 jó eséllyel elmúlt, és a form rögtön
   * hibával jönne vissza. Ilyenkor holnapot ajánlunk.
   */
  const alapNap = horgony > ma() ? horgony : napPlusz(ma(), 1)

  // Az óra felvételéhez való választéklisták — csak adminnak.
  const admin = user.role === 'admin'
  const [tipusok, studiok, oktatok] = admin
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
        { startsAt: { greater_than_equal: tol } },
        { startsAt: { less_than: ig } },
      ],
    },
    sort: 'startsAt', limit: 300, depth: 1,
  })
  const orak = sessions.docs as any[]

  const teltseg = await getTeltseg(
    payload,
    orak.map((s) => ({ id: s.id, studio: s.studio })),
  )

  /*
   * Egyetlen foglalás-lekérdezés mindenre: a résztvevők neveire, a
   * létszámra és a lement órák összegzésére is. depth 2, mert az abo
   * TÍPUSA (neve, kreditje) is kell — egy szinten csak azonosító jönne.
   *
   * A lement óráknál a megjelent és a nem megjelent is beleszámít a
   * létszámba; a `getTeltseg` csak az aktívakat nézi, ami óra után már
   * nulla lenne.
   */
  const SZAMIT = ['booked', 'attended', 'no_show'] as const
  const foglalasok = orak.length
    ? await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { session: { in: orak.map((s) => s.id) } },
            { status: { in: [...SZAMIT] } },
          ],
        },
        sort: 'bookedAt', limit: 2000, depth: 2,
      })
    : { docs: [] as any[] }

  const ALLAPOT_KULCS: Record<string, SzotarKulcs> = {
    attended: 'oktora.status_attended',
    no_show: 'oktora.status_no_show',
  }

  const resztvevokOrankent = new Map<number, Resztvevo[]>()
  const letszamOrankent = new Map<number, number>()
  for (const b of foglalasok.docs as any[]) {
    const sid = typeof b.session === 'object' ? b.session.id : b.session
    letszamOrankent.set(sid, (letszamOrankent.get(sid) ?? 0) + 1)
    const k = b.customer
    const allapotKulcs = ALLAPOT_KULCS[b.status]
    const lista = resztvevokOrankent.get(sid) ?? []
    lista.push({
      id: b.id,
      nev: [k?.firstName, k?.lastName].filter(Boolean).join(' ') || '—',
      gep: b.reformer?.label ?? undefined,
      abo: reszvetelSzoveg(b, t),
      jelzesek: tarifaJelzesek(k, t),
      egeszseg: k?.healthNotes || undefined,
      allapot: szotarKulcs(allapotKulcs) ? t(allapotKulcs) : undefined,
      href: k?.id ? `/kunden/${k.id}` : undefined,
    })
    resztvevokOrankent.set(sid, lista)
  }

  const most = Date.now()
  const esemenyek: NaptarEsemeny[] = orak.map((s) => {
    const elmult = new Date(s.startsAt).getTime() <= most
    const tt = teltseg.get(s.id)
    const letszam = letszamOrankent.get(s.id) ?? 0
    return {
      id: s.id,
      kezdet: s.startsAt,
      nap: napKulcs(s.startsAt),
      perc: s.durationMinutes,
      cim: s.classType?.name ?? '',
      also: [s.instructor?.firstName, s.studio?.city].filter(Boolean).join(' · '),
      harmadik: languageLabel(s) || undefined,
      jeloles: tt ? `${letszam}/${tt.fero}` : undefined,
      telt: Boolean(tt && tt.fero > 0 && letszam >= tt.fero),
      lemondva: s.status === 'cancelled',
      gomb: t('naptar.ansehen'),
      resztvevok: resztvevokOrankent.get(s.id),
      href: `/unterricht/${s.id}`,
    }
  })

  return (
    <main className="shell wide">
      <header className="page-head">
        <h1>{t('okt.cim')}</h1>
        <div className="who">
          {user.firstName} · <Link href="/kunden">{t('kunde.kundinnen')}</Link> ·{' '}
          <Link href="/konto">{t('kozos.mein_konto')}</Link> ·{' '}
          <form action={logout} style={{ display: 'inline' }}>
            <button type="submit" className="linkish">{t('kozos.abmelden_kicsi')}</button>
          </form>
        </div>
      </header>

      <p className="lead">{t('okt.lead_admin')}</p>
      {/* A régi listában ez a lement órák fölött állt. A naptárban is kell:
          enélkül nem derül ki, hol lehet jelenlétet felvenni. */}
      <p className="hint">{t('okt.elmult_hint', { ora: AUTO_CLOSE_HOURS })}</p>

      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      {geloescht && <p className="ok">{t('ujora.torolve')}</p>}

      {admin && tipusok && studiok && oktatok && (
        /* Nyitható blokk, nem állandóan kinyitott űrlap: a lap
           elsődleges dolga a naptár, az óra felvétele ritka művelet. */
        <details className="ujora">
          <summary>{t('ujora.nyit')}</summary>
          <p className="hint">{t('ujora.hint')}</p>
          <form action={addLesson} className="uraplap">
            <label>
              {t('ujora.datum')}
              <input type="date" name="nap" required defaultValue={nap ?? alapNap} min={ma()} />
            </label>
            <label>
              {t('ujora.ido')}
              <input type="time" name="ido" required defaultValue={ido ?? '09:00'} step={300} />
            </label>
            <label>
              {t('ujora.hossz')}
              <input type="number" name="perc" required defaultValue={60} min={15} max={300} step={5} />
            </label>
            <label>
              {t('ujora.tipus')}
              <select name="classType" required>
                {(tipusok.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('ujora.studio')}
              <select name="studio" required>
                {(studiok.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>{x.city}</option>
                ))}
              </select>
            </label>
            <label>
              {t('ujora.oktato')}
              <select name="instructor" required>
                {(oktatok.docs as any[]).map((x) => (
                  <option key={x.id} value={x.id}>
                    {[x.firstName, x.lastName].filter(Boolean).join(' ') || x.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('ujora.nyelv')}
              <select name="nyelv" defaultValue="auto">
                <option value="auto">{t('ujora.nyelv_auto')}</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="szeles">
              {t('ujora.megjegyzes')}
              <input type="text" name="megjegyzes" />
            </label>
            <div className="szeles">
              <button className="btn" type="submit">{t('ujora.gomb')}</button>
            </div>
          </form>
        </details>
      )}

      <Naptar
        mod={mod}
        horgony={horgony}
        esemenyek={esemenyek}
        lang={lang}
        alap="/unterricht"
      />
    </main>
  )
}
