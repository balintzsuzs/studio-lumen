import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { kundeProfil, type KundeOra } from '@/lib/kunde'
import { dayLabel, timeLabel, shortDateLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó, type Fordito, type SzotarKulcs } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const ALLAPOT_KULCS: Record<string, SzotarKulcs> = {
  booked: 'oktora.status_booked',
  attended: 'oktora.status_attended',
  no_show: 'oktora.status_no_show',
  cancelled: 'oktora.status_cancelled',
}

const ABO_STATUS_KULCS: Record<string, SzotarKulcs> = {
  pending: 'kunde.abo_status_pending',
  active: 'kunde.abo_status_active',
  expired: 'kunde.abo_status_expired',
  cancelled: 'kunde.abo_status_cancelled',
}

const ROLE_KULCS: Record<string, SzotarKulcs> = {
  instructor: 'kunde.oktato_cimke',
  admin: 'kunde.admin_cimke',
}

/**
 * Egy óra sora a történetben. Az óra oldalára mutat, nem egy
 * zsákutcába: onnan a jelenlét is javítható, ha utólag kiderül.
 */
const oraSor = (o: KundeOra, t: Fordito, lang: 'de' | 'en', allapottal: boolean) => (
  <li key={o.bookingId} className={o.allapot === 'cancelled' ? 'muted' : undefined}>
    <Link href={`/unterricht/${o.sessionId}`} className="kunde-ora-cim">
      {o.cim || t('kozos.lektion')}
    </Link>
    <span className="kunde-ora-ido">
      {dayLabel(o.kezdet, lang)}, {timeLabel(o.kezdet, lang)}
      {lang === 'de' ? ' Uhr' : ''}
    </span>
    <span className="kunde-ora-hol">
      {[o.oktato, o.studio, o.gep].filter(Boolean).join(' · ')}
    </span>
    {allapottal && ALLAPOT_KULCS[o.allapot] && (
      <span className="tag">
        {t(ALLAPOT_KULCS[o.allapot])}
        {o.allapot === 'cancelled' && o.lemondasTipus === 'late' && t('oktora.storno_keso')}
        {o.allapot === 'cancelled' && o.lemondasTipus === 'by_studio' && t('oktora.storno_studio')}
      </span>
    )}
  </li>
)

export default async function KundeOldal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kundeId = Number(id)

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/kunden/${kundeId}`)
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = forditó(lang)
  const payload = await getPayload({ config })

  const p = Number.isFinite(kundeId) ? await kundeProfil(payload, kundeId) : null
  if (!p) notFound()

  const k = p.kunde
  const nev = [k.firstName, k.lastName].filter(Boolean).join(' ') || k.email
  const st = p.megbizhatosag
  const nyitott = p.korabbi.filter((o) => o.allapot === 'booked').length

  return (
    <main className="shell wide">
      <p className="back"><Link href="/kunden">{t('kunde.lista_vissza')}</Link></p>

      <h1>{nev}</h1>
      {/* Üres bekezdés helyett semmi: egy jelzés nélküli vendégnél a
          címsor alatti rés indokolatlan lyuknak látszana. */}
      {(ROLE_KULCS[k.role] || k.isMatCustomer || p.youngMember) && (
        <p className="lead">
          {ROLE_KULCS[k.role] && <span className="tag">{t(ROLE_KULCS[k.role])}</span>}
          {k.isMatCustomer && <span className="tag">{t('oktora.jelzes_matten')}</span>}
          {p.youngMember && <span className="tag">{t('oktora.jelzes_young')}</span>}
        </p>
      )}

      <div className="kunde-racs">
        <section className="day">
          <h2>{t('kunde.kontakt_cim')}</h2>
          <dl className="adatlap">
            <dt>{t('login.email')}</dt>
            <dd><a href={`mailto:${k.email}`}>{k.email}</a></dd>
            <dt>{t('kunde.telefon')}</dt>
            <dd>
              {k.phone
                ? <a href={`tel:${k.phone}`}>{k.phone}</a>
                : <span className="halvany">{t('kunde.nincs_telefon')}</span>}
            </dd>
            {k.birthYear && (
              <>
                <dt>{t('kunde.jahrgang')}</dt>
                <dd>{k.birthYear}</dd>
              </>
            )}
            <dt>{t('kunde.sprache')}</dt>
            <dd>{k.language === 'en' ? 'English' : 'Deutsch'}</dd>
          </dl>
          {/* Szerkeszteni az admin felületen lehet: egy mezőt két helyen
              írni azt jelentené, hogy két szabályt kell egyben tartani. */}
          <p className="hint">
            <Link href={`/admin/collections/users/${k.id}`}>{t('kunde.szerkeszt')}</Link>
          </p>
        </section>

        <section className="day">
          <h2>{t('kunde.hinweise_cim')}</h2>
          {k.healthNotes
            ? <p className="egeszseg-blokk">{k.healthNotes}</p>
            : <p className="empty">{t('kunde.nincs_hinweis')}</p>}
        </section>
      </div>

      <section className="day">
        <h2>{t('kunde.abok_cim')}</h2>
        {p.abok.length === 0 ? (
          <p className="empty">{t('kunde.nincs_abo')}</p>
        ) : (
          <>
            <p className="hint">{t('kunde.kredit_osszesen', { db: p.kreditOsszesen })}</p>
            <ul className="plain">
              {p.abok.map((a: any) => (
                <li key={a.id} className={a.status === 'active' ? undefined : 'muted'}>
                  {a.aboType?.name ?? t('kozos.lektion')}
                  {' · '}
                  {a.creditsRemaining === 1
                    ? t('kunde.abo_guthaben_egy')
                    : t('kunde.abo_guthaben', { db: a.creditsRemaining ?? 0 })}
                  {a.expiresAt && ` · ${t('kozos.gueltig_bis')} ${shortDateLabel(a.expiresAt, lang)}`}
                  {ABO_STATUS_KULCS[a.status] && (
                    <span className="tag">{t(ABO_STATUS_KULCS[a.status])}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="day">
        <h2>{t('kunde.jovo_cim')}</h2>
        {p.jovobeli.length === 0 ? (
          <p className="empty">{t('kunde.nincs_jovo')}</p>
        ) : (
          <ul className="kunde-orak">
            {p.jovobeli.map((o) => oraSor(o, t, lang, false))}
          </ul>
        )}
      </section>

      <section className="day">
        <h2>{t('kunde.korabbi_cim')}</h2>
        {p.korabbi.length === 0 ? (
          <p className="empty">{t('kunde.nincs_korabbi')}</p>
        ) : (
          <>
            {/* Egy elmúlt óra „gebucht” állapota nem azt jelenti, hogy nem
                volt ott, hanem hogy senki nem vette fel a jelenlétet. Ha ezt
                nem írjuk ki, a nulla statisztika hibának látszik. */}
            {nyitott > 0 && (
              <p className="hint">{t('kunde.nyitott_jelenlet', { db: nyitott })}</p>
            )}
            <p className="hint">
              {t('kunde.statisztika', {
                besucht: st.attended, nem: st.noShows,
                keso: st.lateCancels, idoben: st.inTimeCancels,
              })}
            </p>
            <ul className="kunde-orak">
              {p.korabbi.map((o) => oraSor(o, t, lang, true))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
