import type { Metadata } from 'next'
import '../site.css'

/**
 * The root layout of the English marketing site.
 *
 * It is a separate route group and layout because `<html lang>` can
 * only be set in a root layout, and the German site's is `de`. The
 * stylesheet is the same `site.css` — the design is byte-identical,
 * only the text differs.
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
