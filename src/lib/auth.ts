import 'server-only'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

/** A bejelentkezett felhasználó a Payload süti alapján, vagy null. */
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
