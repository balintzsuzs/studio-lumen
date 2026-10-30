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
export type PageId = 'index' | 'demo'

const PATHS: Record<PageId, Record<Lang, string>> = {
  index: { de: '/', en: '/en' },
  // The demo guide exists only in English. Its anchors point to the
  // home page, and the language switch stays hidden — otherwise both
  // would be dead ends.
  demo: { de: '/demo', en: '/demo' },
}

const TEXT = {
  de: {
    angebot: 'Angebot', galerie: 'Galerie', team: 'Über uns',
    standorte: 'Standorte', preise: 'Preise', kontakt: 'Kontakt',
    konto: 'Konto', meinKonto: 'Mein Konto', anmelden: 'Anmelden',
    buchen: 'Reformer buchen', menu: 'Menü', lang: 'Sprache wählen',
  },
  en: {
    angebot: 'Classes', galerie: 'Gallery', team: 'About us',
    standorte: 'Locations', preise: 'Prices', kontakt: 'Contact',
    konto: 'Account', meinKonto: 'My account', anmelden: 'Sign in',
    buchen: 'Book a class', menu: 'Menu', lang: 'Choose language',
  },
} as const

export default function SiteNav({
  user,
  lang = 'de',
  page = 'index',
  langSwitch = true,
  inNewTab = false,
}: {
  langSwitch?: boolean
  /**
   * Open every menu item in a new tab. Needed on the demo guide:
   * whatever the reader clicks, the guide should stay open beside it.
   * On the ordinary website this would be irritating, so it is off by
   * default.
   */
  inNewTab?: boolean
  user: NavUser
  lang?: Lang
  page?: PageId
}) {
  const [open, setOpen] = useState(false)
  const s = TEXT[lang]

  /** A new tab, if the page asked for it. Never for an on-page anchor. */
  const newTab = inNewTab ? { target: '_blank', rel: 'noopener' } : {}

  // On a subpage the anchors point at the home page, in its own language.
  const home = PATHS[page][lang] === PATHS.index[lang] ? '' : PATHS.index[lang]
  const anchor = (id: string) => `${home}#${id}`

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
          <a href={anchor('angebot')} {...newTab}>{s.angebot}</a>
          <a href={anchor('zug')} {...newTab}>Zug</a>
          <a href={anchor('galerie')} {...newTab}>{s.galerie}</a>
          <a href={anchor('team')} {...newTab}>{s.team}</a>
          <a href={anchor('standorte')} {...newTab}>{s.standorte}</a>
          <a href={anchor('preise')} {...newTab}>{s.preise}</a>
          <a href={anchor('kontakt')} {...newTab}>{s.kontakt}</a>
          {langSwitch && (
          <span className="lang" role="group" aria-label={s.lang}>
            <a href={PATHS[page].de} aria-current={lang === 'de' ? 'true' : undefined}>DE</a>
            <span aria-hidden="true">|</span>
            <a href={PATHS[page].en} aria-current={lang === 'en' ? 'true' : undefined}>EN</a>
          </span>
          )}
          {user ? (
            <a href="/konto" {...newTab}>
              {user.firstName ? `${s.konto} · ${user.firstName}` : s.meinKonto}
            </a>
          ) : (
            <a href="/login" {...newTab}>{s.anmelden}</a>
          )}
          <a href="/buchen" className="btn" {...newTab}>{s.buchen}</a>
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
