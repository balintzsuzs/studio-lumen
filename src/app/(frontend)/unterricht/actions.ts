'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { createSession } from '@/lib/ora'

/**
 * Óra felvétele a stúdió nézetéből.
 *
 * Csak admin: egy új óra a nyilvános órarendre kerül, és azonnal
 * foglalható. Az oktatók a saját óráikat vezetik, de az órarendet
 * Nadine állítja össze.
 */
export async function addLesson(formData: FormData) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/unterricht')
  if (user.role !== 'admin') redirect('/unterricht')

  const nap = String(formData.get('nap') ?? '').trim()
  const ido = String(formData.get('ido') ?? '').trim()
  const nyelv = String(formData.get('nyelv') ?? '')

  const payload = await getClient()
  const r = await createSession(payload, {
    nap,
    ido,
    classTypeId: Number(formData.get('classType')),
    studioId: Number(formData.get('studio')),
    instructorId: Number(formData.get('instructor')),
    perc: Number(formData.get('perc')),
    // „auto": az oktató nyelvei érvényesek — ez az alapeset.
    nyelvek: nyelv === 'de' ? ['de'] : nyelv === 'en' ? ['en'] : undefined,
    megjegyzes: String(formData.get('megjegyzes') ?? '').trim() || undefined,
  })

  revalidatePath('/unterricht')
  revalidatePath('/buchen')

  if (!r.ok) {
    // A kitöltött értékeket visszaadjuk, hogy egy elütés miatt ne
    // kelljen az egész űrlapot újra begépelni.
    const q = new URLSearchParams({ fehler: r.reason, nap, ido })
    redirect(`/unterricht?${q.toString()}&ansicht=nap&datum=${nap}`)
  }
  redirect(`/unterricht/${r.sessionId}?angelegt=1`)
}
