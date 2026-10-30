import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/booking'
import { listPurchasable, getOpenOrder, qualifiesForReduced } from '@/lib/abo'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs, type Fordito } from '@/lib/i18n'
import { order, withdraw } from './actions'

export const dynamic = 'force-dynamic'

/** „3 Monate" / „3 months", és egy hónap alatt napokban. */
const ervenyesseg = (t: Fordito, m: number) =>
  m < 1 ? t('abos.napok', { db: Math.round(m * 30) })
    : m === 1 ? t('abos.egy_honap')
      : t('abos.honapok', { db: m })

export default async function Abos({
  searchParams,
}: {
  searchParams: Promise<{ fehler?: string; bestellt?: string; zurueckgezogen?: string }>
}) {
  const { fehler, bestellt, zurueckgezogen } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser()
  const lang = await getLang(user)
  const t = forditó(lang)

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
          {abo.credits} {abo.credits === 1 ? t('kozos.lektion') : t('kozos.lektionen')} ·{' '}
          {t('abos.ervenyes')} {ervenyesseg(t, abo.validMonths)}
          {abo.voucherOnly && t('abos.nur_gutschein')}
        </p>
      </div>
      <div className="pricecol">
        <p className="price">CHF {abo.priceChf}</p>
        {user && !open && (
          <form action={order} className="orderform">
            <input type="hidden" name="aboTypeId" value={abo.id} />
            <select name="method" defaultValue={abo.voucherOnly ? 'voucher' : 'on_site'}>
              {abo.voucherOnly ? (
                <option value="voucher">{t('abos.fizetes_voucher')}</option>
              ) : (
                <>
                  <option value="on_site">{t('abos.fizetes_on_site')}</option>
                  <option value="transfer">{t('abos.fizetes_transfer')}</option>
                </>
              )}
            </select>
            <button className="btn" type="submit">{t('abos.bestellen')}</button>
          </form>
        )}
      </div>
    </li>
  )

  return (
    <main className="shell wide">
      <p className="back"><Link href="/buchen">{t('kozos.stundenplan_vissza')}</Link></p>

      <p className="eyebrow">{t('abos.eyebrow')}</p>
      <h1>{t('abos.cim')}</h1>
      <p className="lead">{t('abos.lead')}</p>

      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      {bestellt && <p className="ok">{t('abos.megrendelve')}</p>}
      {zurueckgezogen && <p className="ok">{t('abos.visszavonva')}</p>}

      {open && (
        <section className="order-open">
          <h2>{t('abos.nyitott_cim')}</h2>
          <p className="hint">
            <strong>{open.aboType?.name}</strong> · {open.aboType?.credits}{' '}
            {open.aboType?.credits === 1 ? t('kozos.lektion') : t('kozos.lektionen')} · CHF{' '}
            {open.aboType?.priceChf}
          </p>
          <p className="hint">{paymentInstructions}</p>
          <p className="hint">{t('abos.nyitott_ervenyesseg')}</p>
          <form action={withdraw}>
            <input type="hidden" name="aboId" value={open.id} />
            <button className="btn ghost" type="submit">{t('abos.visszavon_gomb')}</button>
          </form>
        </section>
      )}

      <section className="day">
        <h2>{t('abos.reformer')}</h2>
        <ul className="abolist">{standard.map(card)}</ul>
      </section>

      {special.length > 0 && (
        <section className="day">
          <h2>{t('abos.kedvezmenyes_cim')}</h2>
          <p className="hint">{t('abos.kedvezmenyes_leiras')}</p>
          <ul className="abolist">{special.map(card)}</ul>
        </section>
      )}

      {!reduced && <p className="fineprint">{t('abos.kedvezmeny_ajanlat')}</p>}

      {!user && (
        <p className="note">
          {t('abos.belepes_rendeleshez_elott')}{' '}
          <Link href="/login?next=/abos">{t('ora.belepes_szo')}</Link>
          {t('abos.belepes_rendeleshez_utan')}
        </p>
      )}

      <p className="fineprint">{t('abos.aprobetus')}</p>
    </main>
  )
}
