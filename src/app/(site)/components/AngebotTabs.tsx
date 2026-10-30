'use client'

import { useEffect } from 'react'

/**
 * Az Angebot fülei. A statikus oldalon ezt egy `<script>` kapcsolta;
 * a jelölés ugyanaz maradt (`#angebotTabs .tab` és `.panel`), hogy a
 * `site.css` változtatás nélkül működjön. Ezért nem React state-tel
 * vezéreljük, hanem ugyanazt az osztály-kapcsolást végezzük el.
 */
export default function AngebotTabs() {
  useEffect(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLButtonElement>('#angebotTabs .tab'),
    )
    if (!tabs.length) return

    const onClick = (tab: HTMLButtonElement) => () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'))
      tab.setAttribute('aria-selected', 'true')
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('is-active'))
      const target = tab.dataset.panel ? document.getElementById(tab.dataset.panel) : null
      target?.classList.add('is-active')
    }

    const handlers = tabs.map((tab) => {
      const h = onClick(tab)
      tab.addEventListener('click', h)
      return [tab, h] as const
    })
    return () => handlers.forEach(([tab, h]) => tab.removeEventListener('click', h))
  }, [])

  return null
}
