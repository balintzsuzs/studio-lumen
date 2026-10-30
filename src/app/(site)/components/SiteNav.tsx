'use client'

import { useState } from 'react'

export type NavUser = {
  firstName?: string | null
  role?: string | null
} | null

/**
 * A marketing oldal és a foglalórendszer közös navigációja.
 *
 * A statikus oldalon ez egy `<script>` volt, ami egy osztályt kapcsolt.
 * Itt kliens komponens, mert a mobil menü nyitott állapota és a belépett
 * felhasználó neve is ide tartozik — így Nadine egy helyen látja, hogy
 * a weboldal és a foglalás ugyanaz a rendszer.
 *
 * A `DE | EN` váltó a statikus oldalról jön vissza: ugyanaz a jelölés
 * (`<span class="lang">`), hogy a `site.css` változtatás nélkül
 * működjön. A váltó a MÁSIK nyelv megfelelő lapjára visz — az aloldal
 * a saját párjára, nem a nyitólapra —, az aktuális nyelv pedig nem
 * hivatkozás, hanem `aria-current`-tel jelölt szöveg.
 */
type Lang = 'de' | 'en'

/** Melyik lapon állunk, és mi a párja a másik nyelven. */
export type Oldal = 'index' | 'demo'

const PAR: Record<Oldal, Record<Lang, string>> = {
  index: { de: '/', en: '/en' },
  // A demó-útmutató csak angolul létezik. A horgonyok innen a nyitólapra
  // mutatnak, a nyelvváltó pedig elrejtve marad — különben mindkettő
  // zsákutca lenne.
  demo: { de: '/demo', en: '/demo' },
}

const SZOVEG = {
  de: {
    angebot: 'Angebot', galerie: 'Galerie', team: 'Über uns',
    standorte: 'Standorte', preise: 'Preise', kontakt: 'Kontakt',
    konto: 'Konto', meinKonto: 'Mein Konto', anmelden: 'Anmelden',
    buchen: 'Reformer buchen', menu: 'Menü', nyelv: 'Sprache wählen',
  },
  en: {
    angebot: 'Classes', galerie: 'Gallery', team: 'About us',
    standorte: 'Locations', preise: 'Prices', kontakt: 'Contact',
    konto: 'Account', meinKonto: 'My account', anmelden: 'Sign in',
    buchen: 'Book a class', menu: 'Menu', nyelv: 'Choose language',
  },
} as const

export default function SiteNav({
  user,
  lang = 'de',
  oldal = 'index',
  nyelvvalto = true,
  ujLapon = false,
}: {
  nyelvvalto?: boolean
  /**
   * Minden menüpont új fülön nyíljon. A demó-útmutatón kell: onnan
   * bármire kattint, az útmutató maradjon meg mellette. A rendes
   * weboldalon ez zavaró lenne, ezért alapból ki van kapcsolva.
   */
  ujLapon?: boolean
  user: NavUser
  lang?: Lang
  oldal?: Oldal
}) {
  const [open, setOpen] = useState(false)
  const s = SZOVEG[lang]

  /** Új fül, ha a lap úgy kérte. A lapon belüli horgony sosem. */
  const ujFul = ujLapon ? { target: '_blank', rel: 'noopener' } : {}

  // Az aloldalon a horgonyok a nyitólapra mutatnak, a saját nyelvén.
  const haza = PAR[oldal][lang] === PAR.index[lang] ? '' : PAR.index[lang]
  const horgony = (id: string) => `${haza}#${id}`

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a href="#top" className="logo">
          <img src="/bilder/logo.png" alt="Studio Lumen" /> STUDIO LUMEN
        </a>
        <nav
          className={`nav-links${open ? ' open' : ''}`}
          id="navLinks"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName === 'A') setOpen(false)
          }}
        >
          <a href={horgony('angebot')} {...ujFul}>{s.angebot}</a>
          <a href={horgony('zug')} {...ujFul}>Zug</a>
          <a href={horgony('galerie')} {...ujFul}>{s.galerie}</a>
          <a href={horgony('team')} {...ujFul}>{s.team}</a>
          <a href={horgony('standorte')} {...ujFul}>{s.standorte}</a>
          <a href={horgony('preise')} {...ujFul}>{s.preise}</a>
          <a href={horgony('kontakt')} {...ujFul}>{s.kontakt}</a>
          {nyelvvalto && (
          <span className="lang" role="group" aria-label={s.nyelv}>
            <a href={PAR[oldal].de} aria-current={lang === 'de' ? 'true' : undefined}>DE</a>
            <span aria-hidden="true">|</span>
            <a href={PAR[oldal].en} aria-current={lang === 'en' ? 'true' : undefined}>EN</a>
          </span>
          )}
          {user ? (
            <a href="/konto" {...ujFul}>
              {user.firstName ? `${s.konto} · ${user.firstName}` : s.meinKonto}
            </a>
          ) : (
            <a href="/login" {...ujFul}>{s.anmelden}</a>
          )}
          <a href="/buchen" className="btn" {...ujFul}>{s.buchen}</a>
        </nav>
        <button
          className="nav-toggle"
          id="navToggle"
          aria-label={s.menu}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
    </header>
  )
}
