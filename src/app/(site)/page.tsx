import { getCurrentUser } from '@/lib/auth'
import { sendContact } from './actions'
import SiteNav, { type NavUser } from './components/SiteNav'

export const dynamic = 'force-dynamic'

/**
 * The Studio Lumen website's home page.
 *
 * The markup comes from a static HTML page, converted mechanically so
 * the approved design survives exactly. `site.css` is an unchanged
 * copy as well. Only three things differ: navigation is a shared
 * component that knows whether you are signed in; booking goes to our
 * own `/buchen` page rather than an external system; and the Angebot
 * tabs are switched from a client component.
 */
export default async function SitePage({
  searchParams,
}: {
  searchParams: Promise<{ gesendet?: string; formfehler?: string }>
}) {
  const { gesendet, formfehler } = await searchParams
  const user = await getCurrentUser()

  return (
    <>
      <SiteNav user={user as NavUser} />

      <main id="top">

        {/* HERO */}
        <section className="hero">
          <img className="hero-fallback" src="/bilder/hero-reformer.jpg" alt="Reformer Training bei Studio Lumen" style={{ objectPosition: "center 24%" }} />
          <div className="wrap">
            <div className="hero-copy">
              <span className="badge">Zürich &amp; Zug</span>
              <h1>Bewegung &amp; integrative Gesundheit</h1>
              <p className="sub serif">Für körperliche Stärke, ein reguliertes Nervensystem und mentale Balance.</p>
              <p className="small">Reformer Pilates in Zürich und Zug.</p>
              <a href="/buchen" className="btn btn-lg">Reformer buchen</a>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section className="manifesto">
          <div className="wrap">
            <p className="motto serif">Trainiere nicht für den Auftritt, sondern für dein Leben.</p>
            <p className="text">Sechs Reformer in Zürich, vier in Zug. <strong>Kleine Gruppen, in denen wir sehen, wie du dich bewegst</strong>, und dort ansetzen, wo dein Körper es gerade braucht. Ob du zum ersten Mal auf einem Reformer liegst oder dreimal die Woche trainierst.</p>
          </div>
        </section>

        {/* BOOKING */}
        <section id="reformer" className="booking">
          <div className="wrap booking-inner">
            <div className="booking-text">
              <p className="eyebrow">Reformer Pilates buchen</p>
              <h2>Deine Reformer-Stunde in Zürich &amp; Zug</h2>
              <p>Alle Kurse, freien Plätze und Preise findest du im Online-Stundenplan. Laufend neue Termine. Mit einem 5er oder 10er Abo buchst du flexibel an den Tagen, die dir passen.</p>
              <div className="booking-cta">
                <a href="/buchen" className="btn btn-lg">Zum Reformer Stundenplan</a>
                <a href="mailto:info@studio-lumen.ch?subject=Reformer%20Probelektion" className="btn ghost">Probelektion anfragen</a>
              </div>
            </div>
            <div>
              <details className="fold on-dark">
                <summary>So funktioniert die Buchung</summary>
                <div className="fold-body">
                  <ol className="booking-steps">
                    <li><span>1</span> Stundenplan öffnen — die Buchung läuft direkt hier auf der Website.</li>
                    <li><span>2</span> Anmelden, auf Stundenplan und dann Wochenansicht gehen.</li>
                    <li><span>3</span> Freien Termin wählen und mit deinem Abo-Guthaben buchen.</li>
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ANGEBOT */}
        <section id="angebot">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Angebot</p>
              <h2>Reformer Pilates in kleinen Gruppen</h2>
              <p className="lead">Begleitet von Fachpersonen aus dem Gesundheitswesen, für Einsteiger*innen genauso wie für Fortgeschrittene.</p>
            </div>


            <div className="panel is-active">
              <div className="panel-img"><img src="/bilder/reformer-weit.jpg" alt="Reformer Training" /></div>
              <div>
                <h3>Reformer Pilates</h3>
                <p className="meta">Zürich &amp; Zug · Kleingruppe</p>
                <p className="desc">Reformer-Training in kleinen Gruppen, an zwei Standorten. Barfuss oder in rutschfesten Socken, in kleinen Gruppen mit persönlicher Betreuung. Die geführten Bewegungen und der Federwiderstand machen es gelenkschonend, für Einsteiger*innen genauso wie für Fortgeschrittene.</p>
                <p className="price">Kurse, Preise und freie Plätze im Online-Portal.</p>
                <a href="/buchen" className="btn">Zum Reformer Stundenplan</a>
                <p className="panel-links">
                  <a href="mailto:info@studio-lumen.ch?subject=Privat%20oder%20Duettstunden">Privat- oder Duettstunden anfragen</a>
                </p>
              </div>
            </div>




          </div>
        </section>

        {/* PREISE */}
        <section id="preise">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Preise</p>
              <h2>Abonnemente und Einzelstunden</h2>
              <p className="lead">Reformer-Abos gelten für Zürich und Zug. Buchung und Zahlung laufen direkt über diese Website.</p>
            </div>

            <div className="price-groups">

              <div className="price-group">
                <h3>Reformer Pilates</h3>
                <p className="where">Zürich &amp; Zug</p>
                <table className="price-table">
                  <thead>
                    <tr><th>Abonnement</th><th>Gültigkeit</th><th>Preis</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="name">Schnupperlektion<span className="hint">Für dein erstes Mal auf dem Reformer</span></td>
                      <td className="valid">1 Woche</td>
                      <td className="amount">CHF 35</td>
                    </tr>
                    <tr>
                      <td className="name">Einzelstunde</td>
                      <td className="valid">1 Woche</td>
                      <td className="amount">CHF 45</td>
                    </tr>
                    <tr>
                      <td className="name">5er Abo</td>
                      <td className="valid">5 Monate</td>
                      <td className="amount">CHF 215</td>
                    </tr>
                    <tr>
                      <td className="name">10er Abo</td>
                      <td className="valid">7 Monate</td>
                      <td className="amount">CHF 400</td>
                    </tr>
                    <tr>
                      <td className="name">20er Abo</td>
                      <td className="valid">12 Monate</td>
                      <td className="amount">CHF 760</td>
                    </tr>
                    <tr>
                      <td className="name">3er Abo<span className="hint">Nur mit Gutschein</span></td>
                      <td className="valid">3 Monate</td>
                      <td className="amount">CHF 129</td>
                    </tr>
                  </tbody>
                </table>

                <details className="fold" style={{ marginTop: "26px" }}>
                  <summary>Spezialpreise <span className="price-tag">Young Member</span></summary>
                  <div className="fold-body">
                    <p className="price-note" style={{ marginTop: "0", marginBottom: "18px" }}>Für Young Member von 16 bis 24 Jahren.</p>
                    <table className="price-table">
                      <thead>
                        <tr><th>Abonnement</th><th>Gültigkeit</th><th>Preis</th></tr>
                      </thead>
                      <tbody>
                        <tr><td className="name">Schnupperlektion</td><td className="valid">1 Woche</td><td className="amount">CHF 25</td></tr>
                        <tr><td className="name">Einzelstunde</td><td className="valid">1 Woche</td><td className="amount">CHF 40</td></tr>
                        <tr><td className="name">5er Abo</td><td className="valid">5 Monate</td><td className="amount">CHF 195</td></tr>
                        <tr><td className="name">10er Abo</td><td className="valid">7 Monate</td><td className="amount">CHF 360</td></tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>


            </div>

            <div className="price-actions">
              <a href="/abos" className="btn">Abo bestellen</a>
              <a href="/buchen" className="btn ghost">Zum Stundenplan</a>
            </div>
          </div>
        </section>

        {/* ERSTER BESUCH */}
        <section className="benefits tight">
          <div className="wrap">
            <details className="fold">
              <summary>Dein erster Besuch</summary>
              <div className="fold-body">
                <div className="firstvisit-grid">
                  <div>
                    <h4>Was du anziehst</h4>
                    <p>Bequeme Kleidung, in der du dich frei bewegen kannst. Auf dem Reformer trainierst du barfuss oder in rutschfesten Socken.</p>
                  </div>
                  <div>
                    <h4>Wenn du noch nie auf einem Reformer warst</h4>
                    <p>Das ist kein Problem. Die Kurse sind für Einsteiger*innen und Fortgeschrittene, und in der kleinen Gruppe zeigen wir dir jede Übung. Für den Anfang gibt es die Schnupperlektion.</p>
                  </div>
                  <div>
                    <h4>Wie du buchst</h4>
                    <p>Direkt im Stundenplan auf dieser Website. Du wählst deinen Termin und buchst mit dem Guthaben aus deinem Abo.</p>
                  </div>
                  <div>
                    <h4>Wie das Training abläuft</h4>
                    <p>Gelenkschonend, mit geführten Bewegungen und Federwiderstand. In kleinen Gruppen, damit wir dich persönlich betreuen können.</p>
                  </div>
                  <div>
                    <h4>Wenn du Beschwerden hast</h4>
                    <p>Sag uns vor dem Training Bescheid. Wir passen die Übungen an.</p>
                  </div>
                  <div>
                    <h4>Noch Fragen offen?</h4>
                    <p>Schreib an info@studio-lumen.ch. Wir antworten dir gerne vor deinem ersten Termin.</p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* WIRKUNG, collapsible */}
        <section className="benefits tight">
          <div className="wrap">
            <details className="fold">
              <summary>Was regelmässiges Pilates bewirkt</summary>
              <div className="fold-body">
                <div className="benefit-grid">
                  <div>Gezielte Kräftigung der tiefen Bauch- und Rückenmuskulatur</div>
                  <div>Stärkung der Rumpfmuskulatur</div>
                  <div>Stabilisierung der Lendenwirbelsäule</div>
                  <div>Rückenbeschwerden können vermindert werden</div>
                  <div>Nachhaltige aufrechte Körperhaltung</div>
                  <div>Entlastung von Hals, Nacken und Schultern</div>
                  <div>Aufbau der Beckenbodenmuskulatur</div>
                  <div>Vorbeugung gegen Osteoporose und Arthrose</div>
                  <div>Verbesserte Beweglichkeit und Durchblutung</div>
                  <div>Besseres Körperbewusstsein und Koordination</div>
                </div>
                <p className="fold-quote serif">„Nach 10 Stunden fühlen sie sich besser, nach 20 Stunden sehen sie besser aus, nach 30 Stunden haben sie einen neuen Körper.“ <span>Joseph Pilates</span></p>
              </div>
            </details>
          </div>
        </section>

        {/* ZUG */}
        <section id="zug" className="zug-band">
          <div className="wrap">
            <p className="eyebrow">Zwei Standorte</p>
            <h2>Ein Abo, zwei Studios</h2>
            <p>In Zürich und in Zug trainierst du mit demselben Abo. Ein Stundenplan für beide Studios, und du buchst dort, wo es dir gerade besser passt.</p>
            <p className="highlight">Sechs Reformer in Zürich, vier in Zug. Beide Studios sind offen, die Kurse laufen.</p>
            <div className="zug-cta">
              <a href="/buchen" className="btn">Zum Reformer Stundenplan</a>
              <a href="#standorte" className="btn ghost">Standorte ansehen</a>
            </div>
          </div>
        </section>

        <section className="tight">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Studio Zug</p>
              <h2>Hell, ruhig und grosszügig</h2>
              <p className="lead">Vier Reformer, viel Tageslicht und Platz. Lindenhof 3 in Zug, wenige Gehminuten vom Bahnhof.</p>
            </div>
            <div className="photo-strip">
              <a href="/bilder/zug-fenster.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-fenster.jpg" alt="Reformer am Fenster, Studio Zug" /></a>
              <a href="/bilder/zug-wand.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-wand.jpg" alt="Reformer Training Wand, Studio Zug" /></a>
              <a href="/bilder/zug-symmetrie.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-symmetrie.jpg" alt="Trainingsraum Zug" /></a>
              <a href="/bilder/zug-ringe.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-ringe.jpg" alt="Pilates Ringe und Bälle, Studio Zug" /></a>
            </div>
          </div>
        </section>

        {/* GALERIE */}
        <section id="galerie">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Galerie</p>
              <h2>Einblick ins Studio</h2>
            </div>
            <div className="gallery-grid">
              <a href="/bilder/reformer-wall.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-wall.jpg" alt="Reformer Training Wand" /></a>
              <a href="/bilder/reformer-frau3.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-frau3.jpg" alt="Reformer Training" /></a>
              <a href="/bilder/reformer-step.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-step.jpg" alt="Reformer Step" /></a>
              <a href="/bilder/reformer-ring.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-ring.jpg" alt="Reformer mit Pilates Ring" /></a>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Über uns</p>
              <h2>Persönlich. Kompetent. Mit Leidenschaft.</h2>
              <p className="lead">Unser Team begleitet dich mit Fachkompetenz und Freude an der Bewegung, auf deinem Weg zu mehr Gesundheit, Kraft und Wohlbefinden.</p>
            </div>

            <div className="team-grid">
              <div className="team-photo"><img src="/bilder/owner-portrait-4x5.jpg" alt="Nadine Hofer" /></div>
              <div>
                <h3>Nadine Hofer</h3>
                <p className="role">Inhaberin</p>
                <p className="team-bio">Ich habe Studio Lumen gegründet, weil ich Pilates in kleinen Gruppen unterrichten wollte — mit Zeit für jede einzelne Person, statt in vollen Sälen.</p>
                <details className="fold">
                  <summary>Mehr über mich</summary>
                  <div className="fold-body">
                    <p className="team-bio">Am liebsten arbeite ich mit Menschen, die gerade erst anfangen, und mit solchen, die nach einer Verletzung zurückkommen. Beides braucht Geduld und ein genaues Auge.</p>
                    <p className="team-bio">Studio Lumen soll ein Ort sein, an dem niemand das Gefühl hat, hinterherzulaufen. Darum sind die Gruppen klein und die Geräte vorher zugeteilt.</p>
                  </div>
                </details>
                <details className="fold">
                  <summary>Ausbildungen</summary>
                  <div className="fold-body">
                    <ul className="quals">
                      <li>Dipl. Pilates Reha Trainerin</li>
                      <li>Reformer Trainerin</li>
                      <li>Dipl. Bewegungspädagogin</li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>

            <div className="team-block">
              <h3 className="team-block-title">Team</h3>
              <p className="team-block-lead">Persönlich. Kompetent. Mit Leidenschaft. Unser Team begleitet dich mit Fachkompetenz und Freude an der Bewegung.</p>

              <div className="team-people">

                <article className="person">
                  <figure><img src="/bilder/team-aline.jpg" alt="Aline Keller" /></figure>
                  <h4>Aline Keller</h4>
                  <p className="role">Reformer Trainerin</p>
                  <details className="fold">
                    <summary>Mehr erfahren</summary>
                    <div className="fold-body">
                      <p>Ich unterrichte am liebsten die frühen Lektionen. Wer um sieben auf dem Reformer liegt, hat sich bewusst dafür entschieden — das merkt man in der ganzen Stunde.</p>
                    </div>
                  </details>
                </article>

                <article className="person">
                  <figure><img src="/bilder/team-jana.jpg" alt="Jana Brunner" /></figure>
                  <h4>Jana Brunner</h4>
                  <p className="role">Reformer Trainerin</p>
                  <details className="fold">
                    <summary>Mehr erfahren</summary>
                    <div className="fold-body">
                      <p>Mich interessiert vor allem die Haltung im Alltag: was nach der Lektion übrig bleibt, wenn man wieder acht Stunden am Schreibtisch sitzt.</p>
                    </div>
                  </details>
                </article>

                <article className="person">
                  <figure><img src="/bilder/team-elin.jpg" alt="Elin Vogt" /></figure>
                  <h4>Elin Vogt</h4>
                  <p className="role">Reformer Trainerin</p>
                  <p className="lang">Sprache: Englisch</p>
                  <details className="fold">
                    <summary>Mehr erfahren</summary>
                    <div className="fold-body">
                      <p>Ich unterrichte auf Englisch. In einer Gruppe, in der nicht alle dieselbe Muttersprache haben, wird die Ansage kürzer und genauer — das hilft allen.</p>
                    </div>
                  </details>
                </article>

              </div>
            </div>
          </div>
        </section>


        {/* QUOTE */}
        <section className="quote tight">
          <div className="wrap">
            <p className="serif">„Kleine Gruppen, zugeteilte Geräte, und jemand, der hinschaut.“</p>
          </div>
        </section>

        {/* STANDORTE */}
        <section id="standorte" className="benefits">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Standorte</p>
              <h2>Zwei Studios in der Region</h2>
            </div>
            <div className="loc-grid">
              <div className="loc">
                <div className="loc-img"><img src="/bilder/reformer-wall.jpg" alt="Studio Zürich" /></div>
                <div className="loc-body">
                  <p className="tag">Reformertraining</p>
                  <h3>Studio Lumen, Zürich</h3>
                  <p>Werkgasse 7<br />8004 Zürich</p>
                  <a className="route" href="https://www.google.com/maps/search/?api=1&amp;query=Werkgasse+7+8004+Zürich" target="_blank" rel="noopener">Route öffnen</a>
                </div>
              </div>
              <div className="loc">
                <div className="loc-img"><img src="/bilder/zug-wand.jpg" alt="Studio Zug" /></div>
                <div className="loc-body">
                  <p className="tag">Reformertraining</p>
                  <h3>Studio Lumen, Zug</h3>
                  <p>Lindenhof 3<br />6300 Zug</p>
                  <a className="route" href="https://www.google.com/maps/search/?api=1&amp;query=Lindenhof+3+6300+Zug" target="_blank" rel="noopener">Route öffnen</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KONTAKT */}
        <section id="kontakt" className="contact">
          <div className="wrap">
            <div className="contact-strip">
              <div className="contact-item">
                <div className="ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></div>
                <h3>Schreib uns</h3>
                <p><a href="mailto:info@studio-lumen.ch">info@studio-lumen.ch</a></p>
              </div>
              <div className="contact-item">
                <div className="ico"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <h3>Komm vorbei</h3>
                <p>Werkgasse 7, 8004 Zürich</p>
                <p>Lindenhof 3, 6300 Zug</p>
              </div>
            </div>

            <div className="contact-form-wrap">
              <details className="fold on-dark">
                <summary>Nachricht schreiben</summary>
                <div className="fold-body">
                  <form action={sendContact}>
                    <input type="text" name="lastName" placeholder="Name" required />
                    <input type="text" name="firstName" placeholder="Vorname" />
                    <input type="email" name="email" placeholder="E-Mail" required />
                    <input type="text" name="phone" placeholder="Telefon (optional)" />
                    <textarea name="message" rows={4} placeholder="Nachricht" required></textarea>
                    <button type="submit" className="btn">Senden</button>
                    {gesendet && <p className="note">Danke, deine Nachricht ist bei uns. Wir melden uns.</p>}
                    {formfehler && <p className="note">{formfehler}</p>}
                  </form>
                </div>
              </details>
            </div>
          </div>
        </section>

      </main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-cols">
            <div className="foot-brand">
              <a href="#top" className="logo"><img src="/bilder/logo.png" alt="Studio Lumen" /> STUDIO LUMEN</a>
              <p>Bewegung und integrative Gesundheit in Zürich und Zug.</p>
            </div>
            <div className="foot-col">
              <h4>Angebot</h4>
              <ul>
                <li><a href="#angebot">Reformer Pilates</a></li>
                <li><a href="#preise">Preise</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Studio Lumen</h4>
              <ul>
                <li><a href="#team">Über uns</a></li>
                <li><a href="#team">Team</a></li>
                <li><a href="#galerie">Galerie</a></li>
                <li><a href="#zug">Standort Zug</a></li>
                <li><a href="#kontakt">Kontakt</a></li>
                <li><a href="mailto:info@studio-lumen.ch?subject=Offene%20Stellen">Offene Stellen</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Rechtliches</h4>
              <ul>
                <li>AGB, Datenschutz und Impressum sind nicht Teil dieses Übungsprojekts.</li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <small>
              <strong>Erfundenes Studio.</strong> Diese Website ist ein
              Übungsprojekt — Namen, Preise, Adressen und Buchungen sind frei
              erfunden. <a href="/demo">Mehr dazu</a>
            </small>
            <small><a href="/buchen">Reformer buchen</a> · <a href="/konto">Mein Konto</a></small>
          </div>
        </div>
      </footer>

    </>
  )
}
