import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { dateTimeLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs, type SzotarKulcs } from '@/lib/i18n'
import { confirm, reject } from './actions'

export const dynamic = 'force-dynamic'

const FIZETES_KULCS: Record<string, SzotarKulcs> = {
  on_site: 'abos.fizetes_on_site',
  transfer: 'abos.fizetes_transfer',
  voucher: 'abos.fizetes_voucher',
  online: 'abos.fizetes_online',
}

/**
 * The owner's daily to-do list on one page: open pass orders that need
 * releasing once the payment has arrived. The Payload admin (/admin)
 * can do everything, but this page does the one thing quickly.
 */
export default async function Verwaltung({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; freigeschaltet?: string; storniert?: string }>
}) {
  const { fehler, freigeschaltet, storniert } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/verwaltung')
  if (user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = forditó(lang)

  const payload = await getPayload({ config })

  const pending = await payload.find({
    collection: 'abos',
    where: { status: { equals: 'pending' } },
    sort: 'orderedAt', limit: 100, depth: 1,
  })

  const recent = await payload.find({
    collection: 'abos',
    where: { status: { equals: 'active' } },
    sort: '-paidAt', limit: 10, depth: 1,
  })

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('verw.eyebrow')}</p>
          <h1>{t('verw.cim')}</h1>
        </div>
        <p className="who">
          <Link href="/unterricht">{t('kozos.unterricht')}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/kunden">{t('kunde.kundinnen')}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/admin">{t('kozos.admin')}</Link>
        </p>
      </header>

      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      {freigeschaltet && <p className="ok">{t('verw.felszabaditva')}</p>}
      {storniert && <p className="ok">{t('verw.sztornozva')}</p>}

      <p className="lead">{t('verw.lead')}</p>

      {pending.docs.length === 0 ? (
        <p className="empty">{t('verw.nincs_nyitott')}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{t('verw.fej_kundin')}</th>
              <th>{t('verw.fej_abo')}</th>
              <th>{t('verw.fej_betrag')}</th>
              <th>{t('verw.fej_zahlungsart')}</th>
              <th>{t('verw.fej_bestellt')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(pending.docs as any[]).map((a) => (
              <tr key={a.id}>
                <td>
                  {a.customer?.firstName} {a.customer?.lastName}
                  <span className="tag">{a.customer?.email}</span>
                </td>
                <td>
                  {a.aboType?.name}
                  <span className="tag">{a.aboType?.credits} {t('kozos.lektionen')}</span>
                </td>
                <td>CHF {a.aboType?.priceChf}</td>
                <td>
                  {FIZETES_KULCS[a.paymentMethod]
                    ? t(FIZETES_KULCS[a.paymentMethod])
                    : a.paymentMethod}
                  {a.note && <span className="tag">{a.note}</span>}
                </td>
                <td>{a.orderedAt ? dateTimeLabel(a.orderedAt, lang) : '—'}</td>
                <td>
                  <span className="rowactions">
                    <form action={confirm}>
                      <input type="hidden" name="aboId" value={a.id} />
                      <button className="mini on" type="submit">{t('verw.bezahlt_gomb')}</button>
                    </form>
                    <form action={reject}>
                      <input type="hidden" name="aboId" value={a.id} />
                      <button className="mini" type="submit">{t('verw.stornieren_gomb')}</button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="day">
        <h2>{t('verw.utoljara_cim')}</h2>
        {recent.docs.length === 0 ? (
          <p className="empty">{t('verw.nincs_aktiv')}</p>
        ) : (
          <ul className="plain">
            {(recent.docs as any[]).map((a) => (
              <li key={a.id}>
                {a.customer?.firstName} {a.customer?.lastName} · {a.aboType?.name} ·{' '}
                {a.creditsRemaining} {t('kozos.guthaben')}
                {a.paidAt && (
                  <span className="tag">
                    {t('verw.bezahlt_cimke', { datum: dateTimeLabel(a.paidAt, lang) })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
