'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { confirmPayment, cancelOrder } from '@/lib/abo'

/** Admin only. Every action re-checks this, not just the page. */
const authorize = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/verwaltung')
  if (user.role !== 'admin') redirect('/konto')
  return getClient()
}

export async function confirm(formData: FormData) {
  const aboId = Number(formData.get('aboId'))
  const payload = await authorize()
  const r = await confirmPayment(payload, aboId)

  revalidatePath('/verwaltung')
  revalidatePath('/konto')

  if (!r.ok) redirect(`/verwaltung?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect('/verwaltung?freigeschaltet=1')
}

export async function reject(formData: FormData) {
  const aboId = Number(formData.get('aboId'))
  const payload = await authorize()
  const r = await cancelOrder(payload, aboId)

  revalidatePath('/verwaltung')

  if (!r.ok) redirect(`/verwaltung?fehler=${encodeURIComponent(r.reason ?? '')}`)
  redirect('/verwaltung?storniert=1')
}
