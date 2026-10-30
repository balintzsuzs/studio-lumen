'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'
import { getCurrentUser } from '@/lib/auth'
import { orderAbo, cancelOrder, type PaymentMethod } from '@/lib/abo'

const METHODS: PaymentMethod[] = ['on_site', 'transfer', 'voucher']

export async function order(formData: FormData) {
  const aboTypeId = Number(formData.get('aboTypeId'))
  const raw = String(formData.get('method') ?? 'on_site')
  const method = (METHODS.includes(raw as PaymentMethod) ? raw : 'on_site') as PaymentMethod
  const note = String(formData.get('note') ?? '').trim() || undefined

  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/abos')

  const payload = await getClient()
  const result = await orderAbo(payload, user.id as number, aboTypeId, method, note)

  revalidatePath('/abos')
  revalidatePath('/konto')

  if (!result.ok) redirect(`/abos?fehler=${encodeURIComponent(result.reason)}`)
  redirect('/abos?bestellt=1')
}

export async function withdraw(formData: FormData) {
  const aboId = Number(formData.get('aboId'))
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/abos')

  const payload = await getClient()
  const result = await cancelOrder(payload, aboId, user.id as number)

  revalidatePath('/abos')
  revalidatePath('/konto')

  if (!result.ok) redirect(`/abos?fehler=${encodeURIComponent(result.reason ?? '')}`)
  redirect('/abos?zurueckgezogen=1')
}
