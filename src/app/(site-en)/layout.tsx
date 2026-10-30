import type { Metadata } from 'next'
import '../site.css'

/**
 * Az angol marketing oldal gyökér-layoutja.
 *
 * Azért külön route group és külön layout, mert a `<html lang>` csak
 * gyökér-layoutban adható meg, a német oldalé pedig `de`. A stíluslap
 * ugyanaz a `site.css` — a design bájtra azonos, csak a szöveg más.
 */
export const metadata: Metadata = {
  title: 'STUDIO LUMEN | Movement & integrative health, Zürich & Zug',
  description:
    'Reformer Pilates and mat Pilates in Zürich and Zug. One pass, two locations. A practice project with invented data.',
}

export default function SiteLayoutEn({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Cormorant+Garamond:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
