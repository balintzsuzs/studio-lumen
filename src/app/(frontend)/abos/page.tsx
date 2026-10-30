import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/booking'
import { listPurchasable, getOpenOrder, qualifiesForReduced } from '@/lib/abo'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey, type Translator } from '@/lib/i18n'
import { order, withdraw } from './actions'

export const dynamic = 'force-dynamic'

/** "3 Monate" / "3 months", and in days when under a month. */
const validity = (t: Translator, m: number) =>
  m < 1 ? t('passes.days', { count: Math.round(m * 30) })
    : m === 1 ? t('passes.one_month')
      : t('passes.months', { count: m })

export default async function Abos({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; bestellt?: string; zurueckgezogen?: string }>
}) {
  const { fehler, bestellt, zurueckgezogen } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  const lang = await getLang(user)
  const t = translator(lang)

  const types = await listPurchasable(payload, user)
  const open = user ? await getOpenOrder(payload, user.id as number) : null
  const { paymentInstructions } = await getSettings(payload)
  const reduced = qualifiesForReduced(user)

  const standard = types.filter((t2) => t2.tier === 'standard')
  const special = types.filter((t2) => t2.tier === 'reduced')

  const card = (abo: any) => (
    <li key={abo.id} className="abocard">
      <div>
        <h3>{abo.name}</h3>
        <p className="meta">
          {abo.credits} {abo.credits === 1 ? t('common.class') : t('common.classes')} ·{' '}
          {t('passes.valid_for')} {validity(t, abo.validMonths)}
          {abo.voucherOnly && t('passes.voucher_only')}
        </p>
      </div>
      <div className="pricecol">
        <p className="price">CHF {abo.priceChf}</p>
        {user && !open && (
          <form action={order} className="orderform">
            <input type="hidden" name="aboTypeId" value={abo.id} />
            <select name="method" defaultValue={abo.voucherOnly ? 'voucher' : 'on_site'}>
              {abo.voucherOnly ? (
                <option value="voucher">{t('passes.pay_voucher')}</option>
              ) : (
                <>
                  <option value="on_site">{t('passes.pay_on_site')}</option>
                  <option value="transfer">{t('passes.pay_transfer')}</option>
                </>
              )}
            </select>
            <button className="btn" type="submit">{t('passes.order')}</button>
          </form>
        )}
      </div>
    </li>
  )

  return (
    <main className="shell wide">
      <p className="back"><Link href="/buchen">{t('common.schedule_back')}</Link></p>

      <p className="eyebrow">{t('passes.eyebrow')}</p>
      <h1>{t('passes.title')}</h1>
      <p className="lead">{t('passes.lead')}</p>

      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      {bestellt && <p className="ok">{t('passes.ordered')}</p>}
      {zurueckgezogen && <p className="ok">{t('passes.withdrawn')}</p>}

      {open && (
        <section className="order-open">
          <h2>{t('passes.open_order_title')}</h2>
          <p className="hint">
            <strong>{open.aboType?.name}</strong> · {open.aboType?.credits}{' '}
            {open.aboType?.credits === 1 ? t('common.class') : t('common.classes')} · CHF{' '}
            {open.aboType?.priceChf}
          </p>
          <p className="hint">{paymentInstructions}</p>
          <p className="hint">{t('passes.open_order_validity')}</p>
          <form action={withdraw}>
            <input type="hidden" name="aboId" value={open.id} />
            <button className="btn ghost" type="submit">{t('passes.withdraw_button')}</button>
          </form>
        </section>
      )}

      <section className="day">
        <h2>{t('passes.reformer')}</h2>
        <ul className="abolist">{standard.map(card)}</ul>
      </section>

      {special.length > 0 && (
        <section className="day">
          <h2>{t('passes.reduced_title')}</h2>
          <p className="hint">{t('passes.reduced_text')}</p>
          <ul className="abolist">{special.map(card)}</ul>
        </section>
      )}

      {!reduced && <p className="fineprint">{t('passes.reduced_offer')}</p>}

      {!user && (
        <p className="note">
          {t('passes.sign_in_to_order_before')}{' '}
          <Link href="/login?next=/abos">{t('class.sign_in_word')}</Link>
          {t('passes.sign_in_to_order_after')}
        </p>
      )}

      <p className="fineprint">{t('passes.fineprint')}</p>
    </main>
  )
}
