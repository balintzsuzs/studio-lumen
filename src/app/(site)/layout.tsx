import type { Metadata } from 'next'
import '../site.css'

/**
 * The marketing site's own root layout.
 *
 * A separate route group and a separate stylesheet, because `site.css`
 * comes from the static site **unchanged** (where it is `styles.css`)
 * and uses class names such as `.btn` and `.hint` that also appear in
 * the booking system's `globals.css`. This way the two designs cannot
 * collide: `/` and `/buchen` never render on the same page.
 */
export const metadata: Metadata = {
  title: 'STUDIO LUMEN | Bewegung & integrative Gesundheit, Zürich & Zug',
  description:
    'Reformer Pilates in Zürich und Zug. Ein Abo, zwei Standorte. Übungsprojekt mit erfundenen Daten.',
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
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
