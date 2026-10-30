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
 * A foglalórendszer kerete.
 *
 * A nyelvváltó itt van, egy helyen, nem minden lapon külön: a middleware
 * fejlécbe teszi az útvonalat, így a váltó tudja, hova térjen vissza.
 * A `<html lang>` is innen jön, mert a képernyőolvasónak számít, milyen
 * nyelven olvassa fel a lapot.
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
