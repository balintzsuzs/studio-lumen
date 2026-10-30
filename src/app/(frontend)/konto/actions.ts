'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient, cancelBooking } from '@/lib/booking'
import { promoteWaitlist } from '@/lib/waitlist'
import { getCurrentUser } from '@/lib/auth'

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

export async function cancel(formData: FormData) {
  const bookingId = Number(formData.get('bookingId'))
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/konto')

  const payload = await getClient()

  // We need the class id before the cancellation, so that afterwards
  // we can offer the freed-up spot to the people on the waitlist.
  let sessionId: number | null = null
  try {
    const b: any = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0 })
    sessionId = idOf(b.session)
  } catch {
    sessionId = null
  }

  const res = await cancelBooking(payload, user.id as number, bookingId)

  // Offering happens after the cancellation, separately: if it fails,
  // the cancellation still stands, and the scheduler's sweep picks it
  // up.
  if (res.ok && sessionId) {
    try { await promoteWaitlist(payload, sessionId) } catch { /* the scheduler will catch it */ }
    revalidatePath(`/buchen/${sessionId}`)
  }

  revalidatePath('/konto')
  revalidatePath('/buchen')

  if (!res.ok) redirect(`/konto?fehler=${encodeURIComponent(res.reason ?? 'hiba.altalanos')}`)
  redirect(res.refunded ? '/konto?storniert=gutgeschrieben' : '/konto?storniert=verfallen')
}
