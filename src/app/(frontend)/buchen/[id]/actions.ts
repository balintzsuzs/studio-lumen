'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient, createBooking } from '@/lib/booking'
import { joinWaitlist, leaveWaitlist, claimOffer } from '@/lib/waitlist'
import { getCurrentUser } from '@/lib/auth'

const refresh = (sessionId: number) => {
  revalidatePath(`/buchen/${sessionId}`)
  revalidatePath('/buchen')
  revalidatePath('/konto')
}

export async function book(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const reformerRaw = formData.get('reformerId')
  const reformerId = reformerRaw ? Number(reformerRaw) : undefined

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/buchen/${sessionId}`)

  const payload = await getClient()
  const result = await createBooking(payload, user.id as number, sessionId, reformerId)

  refresh(sessionId)

  if (!result.ok) {
    redirect(`/buchen/${sessionId}?fehler=${encodeURIComponent(result.reason)}`)
  }
  redirect('/konto?gebucht=1')
}

/** Feliratkozás a várólistára, ha az óra tele van. */
export async function joinList(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/buchen/${sessionId}`)

  const payload = await getClient()
  const result = await joinWaitlist(payload, user.id as number, sessionId)

  refresh(sessionId)
  if (!result.ok) redirect(`/buchen/${sessionId}?fehler=${encodeURIComponent(result.reason)}`)
  redirect(`/buchen/${sessionId}?warteliste=${result.position}`)
}

/** Leiratkozás a várólistáról. */
export async function leaveList(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const entryId = Number(formData.get('entryId'))
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/buchen/${sessionId}`)

  const payload = await getClient()
  const result = await leaveWaitlist(payload, user.id as number, entryId)

  refresh(sessionId)
  if (!result.ok) redirect(`/buchen/${sessionId}?fehler=${encodeURIComponent(result.reason ?? '')}`)
  redirect(`/buchen/${sessionId}?abgemeldet=1`)
}

/** A kiajánlott hely elfogadása. */
export async function claim(formData: FormData) {
  const sessionId = Number(formData.get('sessionId'))
  const entryId = Number(formData.get('entryId'))
  const reformerRaw = formData.get('reformerId')
  const reformerId = reformerRaw ? Number(reformerRaw) : undefined

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/buchen/${sessionId}`)

  const payload = await getClient()
  const result = await claimOffer(payload, user.id as number, entryId, reformerId)

  refresh(sessionId)
  if (!result.ok) redirect(`/buchen/${sessionId}?fehler=${encodeURIComponent(result.reason)}`)
  redirect('/konto?gebucht=1')
}
