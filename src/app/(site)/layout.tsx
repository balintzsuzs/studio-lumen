import type { Metadata } from 'next'
import '../site.css'

/**
 * A marketing oldal saját gyökér-layoutja.
 *
 * Külön route group és külön stíluslap, mert a `site.css` a statikus
 * oldalról jön **változatlanul** (ott `styles.css`), és olyan
 * osztályneveket használ, mint a `.btn` vagy a `.hint`, amelyek a
 * foglalórendszer `globals.css`-ében is szerepelnek. Így a két design
 * nem tud összeakadni: a `/` és a `/buchen` soha nem ugyanazon a lapon
 * rendereldik.
 */
export const metadata: Metadata = {
  title: 'STUDIO LUMEN | Bewegung & integrative Gesundheit, Zürich & Zug',
  description:
    'Reformer Pilates und Matten Pilates in Zürich und Zug. Ein Abo, zwei Standorte. Übungsprojekt mit erfundenen Daten.',
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
