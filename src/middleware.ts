import { NextResponse, type NextRequest } from 'next/server'
import { LANG_SUTI } from '@/lib/lang'

/**
 * Két dolgot intéz, mindkettőt egy helyen.
 *
 * 1. A marketing oldal nyelve átragad a foglalórendszerre. Aki a `/en`
 *    lapon jár, annak a `/buchen` is angolul jelenjen meg, és fordítva —
 *    anélkül, hogy minden hivatkozásra rá kellene aggatni egy `?lang=`
 *    paramétert. A `/` ugyanígy németre állít.
 *
 * 2. Beteszi az útvonalat egy fejlécbe, mert a szerver komponensek nem
 *    látják. A foglalórendszer elrendezése ebből tudja, hova térjen
 *    vissza a nyelvváltó.
 *
 * A foglalórendszer nyelvváltója nem itt dolgozik, hanem egy
 * szerver-actionben (`src/app/(frontend)/actions.ts`), mert az a
 * `users.language` mezőt is frissíti a belépett felhasználónál.
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

  // A kérés sütijét is átírjuk, hogy a mostani renderelés már ezt lássa,
  // ne csak a következő kérés.
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
