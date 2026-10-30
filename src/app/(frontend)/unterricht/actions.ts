'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { createSession } from '@/lib/lesson'

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

  const day = String(formData.get('day') ?? '').trim()
  const time = String(formData.get('time') ?? '').trim()
  const lang = String(formData.get('lang') ?? '')

  const payload = await getClient()
  const r = await createSession(payload, {
    day,
    time,
    classTypeId: Number(formData.get('classType')),
    studioId: Number(formData.get('studio')),
    instructorId: Number(formData.get('instructor')),
    minutes: Number(formData.get('minutes')),
    // "auto": the instructor's own languages apply — the default case.
    languages: lang === 'de' ? ['de'] : lang === 'en' ? ['en'] : undefined,
    note: String(formData.get('note') ?? '').trim() || undefined,
  })

  revalidatePath('/unterricht')
  revalidatePath('/buchen')

  if (!r.ok) {
    // Hand back what was filled in, so a single typo does not mean
    // retyping the whole form.
    const q = new URLSearchParams({ fehler: r.reason, tag: day, zeit: time })
    redirect(`/unterricht?${q.toString()}&ansicht=tag&datum=${day}`)
  }
  redirect(`/unterricht/${r.sessionId}?angelegt=1`)
}
