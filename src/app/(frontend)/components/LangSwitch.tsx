import { setLanguage } from '../actions'
import type { Lang } from '@/lib/lang'
import { forditó } from '@/lib/i18n'

/**
 * A `DE | EN` váltó a foglalórendszer lapjain.
 *
 * Ugyanaz a jelölés, mint a marketing oldal navigációjában
 * (`<span class="lang">`), hogy egyformán nézzen ki — csak itt űrlap,
 * mert a választást a `users.language` mezőbe is elmentjük.
 *
 * Az aktuális nyelv nem gomb, hanem `aria-current`-tel jelölt szöveg:
 * nincs mire kattintani, ha már azon a nyelven van az ember.
 */
export default function LangSwitch({ lang, next }: { lang: Lang; next: string }) {
  const t = forditó(lang)

  return (
    <form action={setLanguage} className="lang" aria-label={t('kozos.nyelv_valto')}>
      <input type="hidden" name="next" value={next} />
      {lang === 'de' ? (
        <span aria-current="true">DE</span>
      ) : (
        <button type="submit" name="lang" value="de" className="linklike">DE</button>
      )}
      <span aria-hidden="true">|</span>
      {lang === 'en' ? (
        <span aria-current="true">EN</span>
      ) : (
        <button type="submit" name="lang" value="en" className="linklike">EN</button>
      )}
    </form>
  )
}
