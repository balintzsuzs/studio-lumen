'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { markAttendance, closeSession } from '@/lib/attendance'
import { cancelSessionByStudio, cancelForTooFewParticipants } from '@/lib/studio'
import { deleteSession } from '@/lib/lesson'

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

/**
 * Authorisation: only to your own class, an admin to all of them.
 * Every operation goes through this, so hand-written form data cannot
 * be used to interfere with somebody else's class.
 */
const authorize = async (sessionId: number) => {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/unterricht/${sessionId}`)
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const payload = await getClient()
  let session: any
  try {
    session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
  } catch {
    redirect('/unterricht')
  }
  // Any instructor may work on any class: take attendance and cancel
  // it too. There are four of them and they cover for each other.
  return { payload, user, session }
}

const refresh = (sessionId: number) => {
  revalidatePath(`/unterricht/${sessionId}`)
  revalidatePath('/unterricht')
  revalidatePath('/konto')
}

export async function setAttendance(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const bookingId = Number(formData.get('bookingId'))
  const value = String(formData.get('value')) === 'attended' ? 'attended' : 'no_show'

  const { payload } = await authorize(sessionId)

  // The booking has to belong to this class.
  let booking: any
  try {
    booking = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0 })
  } catch {
    redirect(`/unterricht/${sessionId}`)
  }
  if (idOf(booking.session) !== sessionId) redirect(`/unterricht/${sessionId}`)

  const r = await markAttendance(payload, bookingId, value)
  refresh(sessionId)
  if (!r.ok) redirect(`/unterricht/${sessionId}?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect(`/unterricht/${sessionId}?erfasst=1`)
}

export async function close(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const { payload } = await authorize(sessionId)
  const r = await closeSession(payload, sessionId)
  refresh(sessionId)
  if (!r.ok) redirect(`/unterricht/${sessionId}?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect(`/unterricht/${sessionId}?geschlossen=${r.marked}`)
}

export async function cancelLesson(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const reason = String(formData.get('reason') ?? '').trim()
  const { payload } = await authorize(sessionId)

  if (!reason) {
    redirect(`/unterricht/${sessionId}?fehler=${'error.reason_required'}`)
  }

  const r = await cancelSessionByStudio(payload, sessionId, reason)
  refresh(sessionId)
  if (!r.ok) redirect(`/unterricht/${sessionId}?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect(`/unterricht/${sessionId}?abgesagt=${r.notified}`)
}

export async function cancelTooFew(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const { payload } = await authorize(sessionId)
  const r = await cancelForTooFewParticipants(payload, sessionId)
  refresh(sessionId)
  if (!r.ok) redirect(`/unterricht/${sessionId}?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect(`/unterricht/${sessionId}?abgesagt=${r.notified}`)
}

/**
 * Deleting a class. Admin only, and only when nobody is on it — where
 * there are participants, cancelling is the right tool, because it
 * refunds and notifies. `deleteSession` enforces that rule; this only
 * enforces the permission.
 */
export async function deleteLesson(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const { payload, user } = await authorize(sessionId)
  if (user.role !== 'admin') redirect(`/unterricht/${sessionId}`)

  const r = await deleteSession(payload, sessionId)
  revalidatePath('/unterricht')
  revalidatePath('/buchen')
  if (!r.ok) redirect(`/unterricht/${sessionId}?fehler=${encodeURIComponent(r.reason)}`)
  redirect('/unterricht?geloescht=1')
}
