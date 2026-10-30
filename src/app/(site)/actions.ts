'use server'

import { redirect } from 'next/navigation'
import { getClient } from '@/lib/booking'

/**
 * A kapcsolati űrlap feldolgozása.
 *
 * Nyilvános végpont, ezért a bemenetet itt vágjuk és ellenőrizzük —
 * nem bízunk a böngésző `required` attribútumában.
 */
export async function sendContact(formData: FormData) {
  const take = (k: string, max: number) =>
    String(formData.get(k) ?? '').trim().slice(0, max)

  const lastName = take('lastName', 120)
  const firstName = take('firstName', 120)
  const email = take('email', 200)
  const phone = take('phone', 60)
  const message = take('message', 4000)

  const fail = (reason: string) =>
    redirect(`/?formfehler=${encodeURIComponent(reason)}#kontakt`)

  if (!lastName) fail('Bitte gib deinen Namen an.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail('Bitte gib eine gültige E-Mail-Adresse an.')
  if (message.length < 5) fail('Bitte schreib uns ein paar Worte.')

  const payload = await getClient()
  await payload.create({
    collection: 'contact-messages',
    data: {
      firstName: firstName || null,
      lastName,
      email,
      phone: phone || null,
      subject: `Kontaktformular — ${firstName ? firstName + ' ' : ''}${lastName}`,
      message,
      receivedAt: new Date().toISOString(),
      status: 'new',
    },
  })

  redirect('/?gesendet=1#kontakt')
}
