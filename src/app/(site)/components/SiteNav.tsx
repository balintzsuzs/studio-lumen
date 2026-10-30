'use client'

import { useState } from 'react'

export type NavUser = {
  firstName?: string | null
  role?: string | null
} | null

/**
 * Navigation shared by the marketing site and the booking system.
 *
 * On the static site this was a `<script>` that toggled a class. Here
 * it is a client component, because the mobile menu's open state and
 * the signed-in user's name belong here too — so that in one place you
 * can see the website and the booking are the same system.
 *
 * The `DE | EN` switch comes back from the static site: the same
 * markup (`<span class="lang">`) so `site.css` works unchanged. The
 * switch leads to the OTHER language's matching page — a subpage to
 * its own counterpart, not to the home page — and the current language
 * is not a link but text marked with `aria-current`.
 */
type Lang = 'de' | 'en'

/** Which page we are on, and its counterpart in the other language. */
export type Oldal = 'index' | 'demo'

const PAR: Record<Oldal, Record<Lang, string>> = {
  index: { de: '/', en: '/en' },
  // The demo guide exists only in English. Its anchors point to the
  // home page, and the language switch stays hidden — otherwise both
  // would be dead ends.
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
   * Open every menu item in a new tab. Needed on the demo guide:
   * whatever the reader clicks, the guide should stay open beside it.
   * On the ordinary website this would be irritating, so it is off by
   * default.
   */
  ujLapon?: boolean
  user: NavUser
  lang?: Lang
  oldal?: Oldal
}) {
  const [open, setOpen] = useState(false)
  const s = SZOVEG[lang]

  /** A new tab, if the page asked for it. Never for an on-page anchor. */
  const ujFul = ujLapon ? { target: '_blank', rel: 'noopener' } : {}

  // On a subpage the anchors point at the home page, in its own language.
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
