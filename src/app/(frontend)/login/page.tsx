import Link from 'next/link'
import { login } from './actions'
import { getLang } from '@/lib/lang'
import { forditó, szotarKulcs } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function Login({
  searchParams,
}: { searchParams: Promise<{ next?: string; fehler?: string }> }) {
  const { next, fehler } = await searchParams
  const lang = await getLang()
  const t = forditó(lang)

  return (
    <main className="shell narrow">
      <p className="eyebrow">Studio Lumen</p>
      <h1>{t('login.cim')}</h1>
      {szotarKulcs(fehler) && <p className="alert">{t(fehler)}</p>}
      <form action={login} className="form">
        {/* Üresen hagyjuk, ha nincs hova visszatérni: akkor a szerep
            dönti el, hova érkezik — az oktató az óráihoz, nem a
            foglalási laphoz. */}
        <input type="hidden" name="next" value={next ?? ''} />
        <label>
          {t('login.email')}
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          {t('login.jelszo')}
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button className="btn" type="submit">{t('login.cim')}</button>
      </form>
      <p className="note">
        {t('login.megjegyzes')} <Link href="/buchen">{t('login.vissza')}</Link>
      </p>
    </main>
  )
}
