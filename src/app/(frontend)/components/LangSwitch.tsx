import { setLanguage } from '../actions'
import type { Lang } from '@/lib/lang'
import { translator } from '@/lib/i18n'

/**
 * The `DE | EN` switch on the booking system's pages.
 *
 * The same markup as in the marketing site's navigation
 * (`<span class="lang">`) so it looks identical — only here it is a
 * form, because the choice is also saved to `users.language`.
 *
 * The current language is not a button but text marked with
 * `aria-current`: there is nothing to click if you are already reading
 * in that language.
 */
export default function LangSwitch({ lang, next }: { lang: Lang; next: string }) {
  const t = translator(lang)

  return (
    <form action={setLanguage} className="lang" aria-label={t('common.choose_language')}>
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
