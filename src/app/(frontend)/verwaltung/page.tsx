import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { dateTimeLabel } from '@/lib/format'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey, type DictionaryKey } from '@/lib/i18n'
import { confirm, reject } from './actions'

export const dynamic = 'force-dynamic'

const PAYMENT_KEYS: Record<string, DictionaryKey> = {
  on_site: 'passes.pay_on_site',
  transfer: 'passes.pay_transfer',
  voucher: 'passes.pay_voucher',
  online: 'passes.pay_online',
}

/**
 * The owner's daily to-do list on one page: open pass orders that need
 * releasing once the payment has arrived. The Payload admin (/admin)
 * can do everything, but this page does the one thing quickly.
 */
export default async function Administration({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; freigeschaltet?: string; storniert?: string }>
}) {
  const { fehler, freigeschaltet, storniert } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/verwaltung')
  if (user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = translator(lang)

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
          <p className="eyebrow">{t('admin.eyebrow')}</p>
          <h1>{t('admin.title')}</h1>
        </div>
        <p className="who">
          <Link href="/unterricht">{t('common.teaching')}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/kunden">{t('customer.customers')}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/admin">{t('common.admin')}</Link>
        </p>
      </header>

      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      {freigeschaltet && <p className="ok">{t('admin.released')}</p>}
      {storniert && <p className="ok">{t('admin.order_cancelled')}</p>}

      <p className="lead">{t('admin.lead')}</p>

      {pending.docs.length === 0 ? (
        <p className="empty">{t('admin.no_open_orders')}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{t('admin.col_customer')}</th>
              <th>{t('admin.col_pass')}</th>
              <th>{t('admin.col_amount')}</th>
              <th>{t('admin.col_payment_method')}</th>
              <th>{t('admin.col_ordered')}</th>
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
                  <span className="tag">{a.aboType?.credits} {t('common.classes')}</span>
                </td>
                <td>CHF {a.aboType?.priceChf}</td>
                <td>
                  {PAYMENT_KEYS[a.paymentMethod]
                    ? t(PAYMENT_KEYS[a.paymentMethod])
                    : a.paymentMethod}
                  {a.note && <span className="tag">{a.note}</span>}
                </td>
                <td>{a.orderedAt ? dateTimeLabel(a.orderedAt, lang) : '—'}</td>
                <td>
                  <span className="rowactions">
                    <form action={confirm}>
                      <input type="hidden" name="aboId" value={a.id} />
                      <button className="mini on" type="submit">{t('admin.paid_button')}</button>
                    </form>
                    <form action={reject}>
                      <input type="hidden" name="aboId" value={a.id} />
                      <button className="mini" type="submit">{t('admin.cancel_button')}</button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="day">
        <h2>{t('admin.recently_released')}</h2>
        {recent.docs.length === 0 ? (
          <p className="empty">{t('admin.no_active')}</p>
        ) : (
          <ul className="plain">
            {(recent.docs as any[]).map((a) => (
              <li key={a.id}>
                {a.customer?.firstName} {a.customer?.lastName} · {a.aboType?.name} ·{' '}
                {a.creditsRemaining} {t('common.credits')}
                {a.paidAt && (
                  <span className="tag">
                    {t('admin.paid_label', { date: dateTimeLabel(a.paidAt, lang) })}
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
