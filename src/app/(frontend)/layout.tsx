import type { Metadata } from 'next'
import { headers } from 'next/headers'
import '../globals.css'
import { getCurrentUser } from '@/lib/auth'
import { getLang } from '@/lib/lang'
import { UTVONAL_FEJLEC } from '@/middleware'
import LangSwitch from './components/LangSwitch'

export const metadata: Metadata = {
  title: 'Studio Lumen · Buchung',
  description: 'Reformer Pilates buchen in Zürich und Zug.',
}

/**
 * The booking system's shell.
 *
 * The language switch lives here, in one place, rather than on every
 * page: the middleware puts the pathname into a header, so the switch
 * knows where to return to. `<html lang>` comes from here too, because
 * it matters to a screen reader which language it reads the page in.
 */
export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  const lang = await getLang(user)
  const h = await headers()
  const utvonal = h.get(UTVONAL_FEJLEC) ?? '/buchen'

  return (
    <html lang={lang}>
      <body>
        <div className="topbar">
          <LangSwitch lang={lang} next={utvonal} />
        </div>
        {children}
      </body>
    </html>
  )
}
