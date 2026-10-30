'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { createSession } from '@/lib/ora'

/**
 * Creating a class from the studio view.
 *
 * Admin only: a new class goes onto the public schedule and is
 * immediately bookable. Instructors run their own classes, but the
 * owner puts the timetable together.
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
    // "auto": the instructor's own languages apply — the default case.
    nyelvek: nyelv === 'de' ? ['de'] : nyelv === 'en' ? ['en'] : undefined,
    megjegyzes: String(formData.get('megjegyzes') ?? '').trim() || undefined,
  })

  revalidatePath('/unterricht')
  revalidatePath('/buchen')

  if (!r.ok) {
    // Hand back what was filled in, so a single typo does not mean
    // retyping the whole form.
    const q = new URLSearchParams({ fehler: r.reason, nap, ido })
    redirect(`/unterricht?${q.toString()}&ansicht=nap&datum=${nap}`)
  }
  redirect(`/unterricht/${r.sessionId}?angelegt=1`)
}
