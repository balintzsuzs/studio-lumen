'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { isLang, LANG_SUTI } from '@/lib/lang'

/**
 * A foglalórendszer nyelvváltója.
 *
 * Két dolgot csinál: beírja a `lang` sütit, és ha van belépett
 * felhasználó, a `users.language` mezőt is frissíti. Így a választás
 * a következő gépen is megmarad, és az értesítő levelek is azon a
 * nyelven érkeznek, amit az ügyfél az oldalon választott.
 *
 * Azért szerver-action és nem sima hivatkozás, mert a mentéshez
 * írni kell az adatbázisba — egy linkkel az nem menne. JavaScript
 * nélkül is működik, mert sima űrlap-beküldés.
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
      // A süti már megvan, a lap a kért nyelven jelenik meg. Ha a mentés
      // nem sikerült, legfeljebb egy másik gépen kell újra választani.
    }
  }

  // Oda térünk vissza, ahonnan a látogató jött. Csak saját útvonalra,
  // hogy a mezőt ne lehessen idegen oldalra irányításra használni.
  const vissza = String(formData.get('next') ?? '/buchen')
  redirect(vissza.startsWith('/') && !vissza.startsWith('//') ? vissza : '/buchen')
}
