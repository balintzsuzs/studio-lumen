import 'server-only'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/** The signed-in user, from the Payload cookie, or null. */
export const getCurrentUser = async () => {
  const payload = await getPayload({ config })
  const h = await headers()
  const { user } = await payload.auth({ headers: h })
  return user ?? null
}

export const hasSession = async () => {
  const c = await cookies()
  return Boolean(c.get('payload-token'))
}
