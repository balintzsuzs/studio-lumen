'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { isLang, LANG_SUTI } from '@/lib/lang'

/**
 * The booking system's language switch.
 *
 * It does two things: writes the `lang` cookie, and, if someone is
 * signed in, updates their `users.language` field too. That way the
 * choice survives onto the next machine, and notification emails
 * arrive in the language the customer picked on the site.
 *
 * It is a server action rather than a plain link because saving means
 * writing to the database, which a link cannot do. It works without
 * JavaScript, being an ordinary form submission.
 */
export async function setLanguage(formData: FormData) {
  const kert = String(formData.get('lang') ?? '')
  if (!isLang(kert)) redirect('/buchen')

  const sutik = await cookies()
  sutik.set(LANG_SUTI.nev, kert, LANG_SUTI.beallitas)

  const user = await getCurrentUser()
  if (user && user.language !== kert) {
    try {
      const payload = await getPayload({ config })
      await payload.update({
        collection: 'users',
        id: user.id as number,
        data: { language: kert },
        overrideAccess: true,
      })
    } catch {
      // The cookie is already set, so the page renders in the chosen
      // language. If the save failed, the worst case is picking again
      // on another machine.
    }
  }

  // Return to wherever the visitor came from. Only to our own paths,
  // so the field cannot be used to redirect to another site.
  const vissza = String(formData.get('next') ?? '/buchen')
  redirect(vissza.startsWith('/') && !vissza.startsWith('//') ? vissza : '/buchen')
}
