import { NextResponse, type NextRequest } from 'next/server'
import { LANG_COOKIE } from '@/lib/lang'

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
export const PATH_HEADER = 'x-site-pathname'

const LANG_PREFIX: Array<[RegExp, 'de' | 'en']> = [
  [/^\/en(\/|$)/, 'en'],
  [/^\/$/, 'de'],
]

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const match = LANG_PREFIX.find(([pattern]) => pattern.test(pathname))
  const lang = match?.[1]
  const changes = Boolean(lang) && request.cookies.get(LANG_COOKIE.name)?.value !== lang

  // Rewrite the cookie on the request too, so the current render
  // already sees it, not only the next request.
  if (changes && lang) request.cookies.set(LANG_COOKIE.name, lang)

  const headers = new Headers(request.headers)
  headers.set(PATH_HEADER, pathname + search)

  const response = NextResponse.next({ request: { headers } })
  if (changes && lang) response.cookies.set(LANG_COOKIE.name, lang, LANG_COOKIE.options)
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
