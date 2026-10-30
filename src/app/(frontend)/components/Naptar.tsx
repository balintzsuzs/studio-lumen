import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { forditó, type SzotarKulcs } from '@/lib/i18n'
import {
  naptarNapjai, naptarLepes, azonosHonap, honapKezdete, ma, type NaptarMod,
} from '@/lib/naptar'
import { napNeveRovid, napNeve, napEsHonap, honapEsEv, timeLabel } from '@/lib/format'
import type { Resztvevo } from '@/lib/resztvevo'

/**
 * Calendar: day, week, month — the same component on the schedule and
 * on the studio's side.
 *
 * Built around the day. The month at the top, below it a horizontal
 * date strip with the selected day highlighted; under that, the day's
 * classes stacked in readable rows. The week and month views use the
 * same rows, just across more days.
 *
 * The component knows nothing about the database. The page assembles
 * the events and the calendar only lays them out — so one structure
 * serves both the customer and the instructor, even though they put
 * different things in the rows.
 *
 * The view and the date live in the URL (`?ansicht=…&datum=…`), not in
 * state: shareable, works with the back button, and survives a reload.
 */

export type NaptarEsemeny = {
  id: number
  /** Start time, ISO. */
  kezdet: string
  nap: string
  /** Duration in minutes, for the bottom line of the left column. */
  perc?: number
  cim: string
  /** "Elin · Zürich" — who teaches it and where. */
  also?: string
  /** A third line, if any: language, note. */
  harmadik?: string
  /** Short status: "5 frei", "ausgebucht", "3/5". */
  jeloles?: string
  telt?: boolean
  lemondva?: boolean
  /** The button's label; without one, no button is rendered. */
  gomb?: string
  /**
   * Who is coming. Only filled in on the studio's side: there the
   * class on its own says little, and it is the names the instructor
   * cares about.
   */
  resztvevok?: Resztvevo[]
  href: string
}

type Props = {
  mod: NaptarMod
  horgony: string
  esemenyek: NaptarEsemeny[]
  lang: Lang
  alap: string
  extra?: Record<string, string | undefined>
}

const MOD_KULCS: Record<NaptarMod, SzotarKulcs> = {
  nap: 'naptar.nap',
  het: 'naptar.het',
  honap: 'naptar.honap',
}

export default function Naptar({ mod, horgony, esemenyek, lang, alap, extra }: Props) {
  const t = forditó(lang)
  const maKulcs = ma()

  const link = (p: { mod?: NaptarMod; datum?: string }) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(extra ?? {})) if (v) q.set(k, v)
    q.set('ansicht', p.mod ?? mod)
    q.set('datum', p.datum ?? horgony)
    return `${alap}?${q.toString()}`
  }

  const napEsemenyei = (nap: string) =>
    esemenyek.filter((e) => e.nap === nap).sort((a, b) => a.kezdet.localeCompare(b.kezdet))

  /** The date strip always shows the week of the selected day. */
  const savNapjai = naptarNapjai('het', horgony)

  /** Paging the strip: by a week, even when the month view is active. */
  const savLepes = (irany: 1 | -1) =>
    link({ datum: naptarLepes('het', horgony, irany) })

  const fejlecFelirat =
    mod === 'honap'
      ? honapEsEv(horgony, lang)
      : mod === 'het'
        ? `${napEsHonap(savNapjai[0], lang)} – ${napEsHonap(savNapjai[6], lang)}`
        : honapEsEv(horgony, lang)

  /** One class's row. The same in every view, only denser in the month grid. */
  const sor = (e: NaptarEsemeny, tomor = false) => (
    <li key={e.id} className={`ora-sor${e.lemondva ? ' lemondva' : ''}${tomor ? ' tomor' : ''}`}>
      <div className="ora-ido">
        <span className="ido">{timeLabel(e.kezdet, lang)}</span>
        {e.perc && !tomor && <span className="hossz">{e.perc} {t('kozos.min_rovid')}</span>}
      </div>

      <div className="ora-torzs">
        <Link href={e.href} className="ora-cim">{e.cim}</Link>
        {e.also && <p className="ora-also">{e.also}</p>}
        {e.harmadik && !tomor && <p className="ora-harmadik">{e.harmadik}</p>}
      </div>

      <div className="ora-jobb">
        {e.jeloles && (
          <span className={`ora-jeloles${e.telt ? ' telt' : ''}`}>{e.jeloles}</span>
        )}
        {e.gomb && !tomor && (
          <Link href={e.href} className="btn ora-gomb">{e.gomb}</Link>
        )}
      </div>

      {e.resztvevok && e.resztvevok.length > 0 && (
        <ul className="resztvevok">
          {e.resztvevok.map((r) => (
            <li key={r.id} className={r.allapot ? 'halvany' : undefined}>
              {r.href
                ? <Link href={r.href} className="r-nev">{r.nev}</Link>
                : <span className="r-nev">{r.nev}</span>}
              {r.gep && <span className="r-gep">{r.gep}</span>}
              {r.abo && <span className="r-abo">{r.abo}</span>}
              {r.allapot && <span className="r-allapot">{r.allapot}</span>}
              {r.jelzesek.length > 0 && (
                <span className="r-jelzes">{r.jelzesek.join(' · ')}</span>
              )}
              {r.egeszseg && (
                <span className="r-egeszseg">
                  {t('oktora.gesundheit')}: {r.egeszseg}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )

  const napBlokk = (nap: string, fejlec = true) => {
    const lista = napEsemenyei(nap)
    return (
      <div key={nap} className="naptar-napblokk">
        {fejlec && (
          <h3 className={nap === maKulcs ? 'ma' : undefined}>
            {napNeve(nap, lang)}, {napEsHonap(nap, lang)}
          </h3>
        )}
        {lista.length === 0 ? (
          <p className="empty">{t('naptar.nincs_ora')}</p>
        ) : (
          <ul className="ora-lista">{lista.map((e) => sor(e))}</ul>
        )}
      </div>
    )
  }

  return (
    <section className="naptar">
      {/* --- fejléc: hónap és nézetválasztó --- */}
      <header className="naptar-fej">
        <h2 className="naptar-honapnev">{fejlecFelirat}</h2>
        <nav className="naptar-modok" aria-label={t('naptar.nezet')}>
          {(['nap', 'het', 'honap'] as NaptarMod[]).map((m) => (
            <Link
              key={m}
              href={link({ mod: m })}
              className={`mod${m === mod ? ' on' : ''}`}
              aria-current={m === mod ? 'page' : undefined}
            >
              {t(MOD_KULCS[m])}
            </Link>
          ))}
        </nav>
      </header>

      {/* --- dátumsáv: a hét napjai körökben --- */}
      <div className="datumsav">
        <Link href={savLepes(-1)} className="sav-nyil" aria-label={t('naptar.elozo')}>‹</Link>

        <ol className="sav-napok">
          {savNapjai.map((nap) => {
            const vanOra = napEsemenyei(nap).length > 0
            const kivalasztott = nap === horgony && mod !== 'honap'
            return (
              <li key={nap}>
                <Link
                  /* Clicking a specific day means I want to see that
                     day, not its week. The toggle above is there for
                     the week and month views — this strip is about
                     days. */
                  href={link({ mod: 'nap', datum: nap })}
                  className={`sav-nap${kivalasztott ? ' on' : ''}${nap === maKulcs ? ' ma' : ''}`}
                  aria-current={kivalasztott ? 'date' : undefined}
                >
                  <span className="sav-betu">{napNeveRovid(nap, lang)}</span>
                  <span className="sav-szam">{Number(nap.slice(8))}</span>
                  <span className={`sav-pont${vanOra ? '' : ' ures'}`} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>

        <Link href={savLepes(1)} className="sav-nyil" aria-label={t('naptar.kovetkezo')}>›</Link>
      </div>

      <p className="naptar-megjegyzes">
        <Link href={link({ datum: maKulcs })} className="ma-link">{t('naptar.ma')}</Link>
        <span aria-hidden="true"> · </span>
        {t('naptar.zeitzone')}
      </p>

      {/* --- tartalom --- */}
      {mod === 'nap' && <div className="naptar-tartalom">{napBlokk(horgony)}</div>}

      {mod === 'het' && (
        <div className="naptar-tartalom">
          {savNapjai.filter((n) => napEsemenyei(n).length > 0).length === 0 ? (
            <p className="empty">{t('naptar.nincs_ora')}</p>
          ) : (
            savNapjai
              .filter((n) => napEsemenyei(n).length > 0)
              .map((nap) => napBlokk(nap))
          )}
        </div>
      )}

      {mod === 'honap' && (
        <div className="naptar-tartalom">
          {naptarNapjai('honap', horgony)
            .filter((n) => azonosHonap(n, honapKezdete(horgony)) && napEsemenyei(n).length > 0)
            .map((nap) => napBlokk(nap))}
          {naptarNapjai('honap', horgony).every(
            (n) => !azonosHonap(n, honapKezdete(horgony)) || napEsemenyei(n).length === 0,
          ) && <p className="empty">{t('naptar.nincs_ora')}</p>}
        </div>
      )}
    </section>
  )
}
