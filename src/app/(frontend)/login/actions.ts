'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  // With an empty `next`, the role decides where they land:
  // instructors and admins at their classes, customers at the
  // schedule. Without this an instructor landed on the booking page
  // too, seeing exactly what a guest sees.
  const requestedPath = String(formData.get('next') ?? '')

  let token: string | undefined
  let role: string | undefined
  try {
    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    token = result.token
    role = (result.user as { role?: string } | undefined)?.role
  } catch {
    redirect(
      `/login?fehler=error.wrong_password${
        requestedPath ? `&next=${encodeURIComponent(requestedPath)}` : ''
      }`,
    )
  }

  if (!token) {
    redirect('/login?fehler=error.sign_in_failed')
  }

  const c = await cookies()
  c.set('payload-token', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  })
  const fallback =
    role === 'instructor' || role === 'admin' ? '/unterricht' : '/buchen'
  redirect(requestedPath || fallback)
}

export async function logout() {
  const c = await cookies()
  c.delete('payload-token')
  redirect('/buchen')
}
