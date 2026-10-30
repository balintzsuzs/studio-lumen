import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { kundeLista } from '@/lib/kunde'
import { getLang } from '@/lib/lang'
import { forditó } from '@/lib/i18n'
import { logout } from '../login/actions'

export const dynamic = 'force-dynamic'

type Search = Promise<{ q?: string }>

/**
 * A vendégek listája. Belépő a profilokhoz, és semmi több: a kereső
 * mellett csak annyit mutat, amivel egy nevet meg lehet találni.
 *
 * Az oktatók is látják, nem csak az admin — ugyanaz az indok, mint a
 * stúdió naptáránál: négyen tartják az órákat és beugranak egymás
 * helyett, és aki beugrik, annak elérnie is kell a vendéget.
 */
export default async function Kunden({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/kunden')
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = forditó(lang)
  const payload = await getPayload({ config })

  const lista = await kundeLista(payload, q)

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('kunde.eyebrow')}</p>
          <h1>{t('kunde.lista_cim')}</h1>
        </div>
        <div className="who">
          <Link href="/unterricht">{t('kozos.unterricht')}</Link>
          <span aria-hidden="true"> · </span>
          <form action={logout} style={{ display: 'inline' }}>
            <button type="submit" className="linkish">{t('kozos.abmelden_kicsi')}</button>
          </form>
        </div>
      </header>

      <p className="lead">{t('kunde.lista_lead')}</p>

      <form className="kereso" action="/kunden" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('kunde.kereses')}
          aria-label={t('kunde.kereses')}
        />
        <button className="btn ghost" type="submit">{t('kunde.keres_gomb')}</button>
        {q && <Link href="/kunden" className="linkish">{t('kunde.keres_torles')}</Link>}
      </form>

      {lista.length === 0 ? (
        <p className="empty">{q ? t('kunde.nincs_talalat') : t('kunde.senki')}</p>
      ) : (
        <>
          <p className="hint">
            {lista.length === 1 ? t('kunde.db_egy') : t('kunde.db', { db: lista.length })}
          </p>
          <div className="tabla-keret">
            <table className="list">
              <thead>
                <tr>
                  <th>{t('kunde.fej_nev')}</th>
                  <th>{t('kunde.fej_kontakt')}</th>
                  <th>{t('kunde.fej_hinweise')}</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((k) => (
                  <tr key={k.id}>
                    <td><Link href={`/kunden/${k.id}`}>{k.nev}</Link></td>
                    <td>
                      <a href={`mailto:${k.email}`}>{k.email}</a>
                      {k.telefon && <><br /><a href={`tel:${k.telefon}`}>{k.telefon}</a></>}
                    </td>
                    <td>
                      {/* A megjegyzés tartalma csak a profilon látszik. */}
                      {k.egeszseg && (
                        <span className="tag egeszseg">{t('kunde.van_egeszseg')}</span>
                      )}
                      {k.mattenKunde && <span className="tag">{t('oktora.jelzes_matten')}</span>}
                      {k.youngMember && <span className="tag">{t('oktora.jelzes_young')}</span>}
                      {!k.egeszseg && !k.mattenKunde && !k.youngMember && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
