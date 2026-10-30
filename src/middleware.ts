import { NextResponse, type NextRequest } from 'next/server'
import { LANG_SUTI } from '@/lib/lang'

/**
 * Handles two things, both in one place.
 *
 * 1. The marketing site's language carries over to the booking system.
 *    Someone on `/en` should get `/buchen` in English too, and the
 *    other way round — without hanging a `?lang=` parameter on every
 *    link. `/` sets German the same way.
 *
 * 2. It puts the pathname into a header, because server components
 *    cannot see it. The booking system's layout uses that to know
 *    where the language switch should return to.
 *
 * The booking system's own language switch does not work here but in a
 * server action (`src/app/(frontend)/actions.ts`), because that also
 * updates the `users.language` field for a signed-in user.
 */
export const UTVONAL_FEJLEC = 'x-site-pathname'

const NYELV_UTVONAL: Array<[RegExp, 'de' | 'en']> = [
  [/^\/en(\/|$)/, 'en'],
  [/^\/$/, 'de'],
]

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const talalat = NYELV_UTVONAL.find(([minta]) => minta.test(pathname))
  const nyelv = talalat?.[1]
  const valtozik = Boolean(nyelv) && request.cookies.get(LANG_SUTI.nev)?.value !== nyelv

  // Rewrite the cookie on the request too, so the current render
  // already sees it, not only the next request.
  if (valtozik && nyelv) request.cookies.set(LANG_SUTI.nev, nyelv)

  const headers = new Headers(request.headers)
  headers.set(UTVONAL_FEJLEC, pathname + search)

  const response = NextResponse.next({ request: { headers } })
  if (valtozik && nyelv) response.cookies.set(LANG_SUTI.nev, nyelv, LANG_SUTI.beallitas)
  return response
}

export const config = {
  matcher: [
    '/',
    '/en',
    '/en/:path*',
    '/buchen/:path*',
    '/konto/:path*',
    '/login/:path*',
    '/abos/:path*',
    '/unterricht/:path*',
    '/verwaltung/:path*',
  ],
}
