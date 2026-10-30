import Link from 'next/link'
import { login } from './actions'
import { getLang } from '@/lib/lang'
import { translator, isDictionaryKey } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function Login({
  searchParams,
}: { searchParams: Promise<{ next?: string; fehler?: string }> }) {
  const { next, fehler } = await searchParams
  const lang = await getLang()
  const t = translator(lang)

  return (
    <main className="shell narrow">
      <p className="eyebrow">Studio Lumen</p>
      <h1>{t('login.title')}</h1>
      {isDictionaryKey(fehler) && <p className="alert">{t(fehler)}</p>}
      <form action={login} className="form">
        {/* Left empty when there is nowhere to return to: then the role
            decides where they land — an instructor at their classes,
            not at the booking page. */}
        <input type="hidden" name="next" value={next ?? ''} />
        <label>
          {t('login.email')}
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          {t('login.password')}
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button className="btn" type="submit">{t('login.title')}</button>
      </form>
      <p className="note">
        {t('login.note')} <Link href="/buchen">{t('login.back')}</Link>
      </p>
    </main>
  )
}
