'use client'

import { useEffect } from 'react'

/**
 * The Angebot tabs. On the static site a `<script>` switched these; the
 * markup stayed the same (`#angebotTabs .tab` and `.panel`) so
 * `site.css` works unchanged. Hence they are not driven by React state
 * but by performing the same class toggling.
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
