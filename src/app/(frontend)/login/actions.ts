'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  // Üres `next` esetén a szerep dönti el, hova érkezik: az oktató és az
  // admin az óráihoz, az ügyfél az órarendhez. Enélkül az oktató is a
  // foglalási lapon landolt, és ugyanazt látta, mint egy vendég.
  const kertUtvonal = String(formData.get('next') ?? '')

  let token: string | undefined
  let szerep: string | undefined
  try {
    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    token = result.token
    szerep = (result.user as { role?: string } | undefined)?.role
  } catch {
    redirect(
      `/login?fehler=hiba.rossz_jelszo${
        kertUtvonal ? `&next=${encodeURIComponent(kertUtvonal)}` : ''
      }`,
    )
  }

  if (!token) {
    redirect('/login?fehler=hiba.belepes_sikertelen')
  }

  const c = await cookies()
  c.set('payload-token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
  const alapertelmezett =
    szerep === 'instructor' || szerep === 'admin' ? '/unterricht' : '/buchen'
  redirect(kertUtvonal || alapertelmezett)
}

export async function logout() {
  const c = await cookies()
  c.delete('payload-token')
  redirect('/buchen')
}
