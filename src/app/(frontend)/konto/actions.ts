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

  // Az óra azonosítója még a lemondás előtt kell, hogy utána ki tudjuk
  // ajánlani a felszabadult helyet a várólistán állóknak.
  let sessionId: number | null = null
  try {
    const b: any = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0 })
    sessionId = idOf(b.session)
  } catch {
    sessionId = null
  }

  const res = await cancelBooking(payload, user.id as number, bookingId)

  // A kiajánlás a lemondás után, külön: ha ez hibára fut, a lemondás
  // akkor is érvényes marad, és az ütemező söprése behozza.
  if (res.ok && sessionId) {
    try { await promoteWaitlist(payload, sessionId) } catch { /* az ütemező pótolja */ }
    revalidatePath(`/buchen/${sessionId}`)
  }

  revalidatePath('/konto')
  revalidatePath('/buchen')

  if (!res.ok) redirect(`/konto?fehler=${encodeURIComponent(res.reason ?? 'hiba.altalanos')}`)
  redirect(res.refunded ? '/konto?storniert=gutgeschrieben' : '/konto?storniert=verfallen')
}
