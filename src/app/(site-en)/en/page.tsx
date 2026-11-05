import { getCurrentUser } from '@/lib/auth'
import { sendContact } from '../../(site)/actions'
import SiteNav, { type NavUser } from '../../(site)/components/SiteNav'

export const dynamic = 'force-dynamic'

/**
 * The English home page of the Studio Lumen website.
 *
 * The markup comes from the static English HTML page, through the same
 * mechanical conversion as its German counterpart — their DOM
 * structures match tag for tag, only the text differs. The contact
 * form and the navigation are components shared with the German side.
 */
export default async function SitePageEn({
  searchParams,
}: {
  searchParams: Promise<{ gesendet?: string; formfehler?: string }>
}) {
  const { gesendet, formfehler } = await searchParams
  const user = await getCurrentUser()

  return (
    <>
      <SiteNav user={user as NavUser} lang="en" />

      <main id="top">

        {/* HERO */}
        <section className="hero">
          <img className="hero-fallback" src="/bilder/hero-reformer.jpg" alt="Reformer training at Studio Lumen" style={{ objectPosition: "center 24%" }} />
          <div className="wrap">
            <div className="hero-copy">
              <span className="badge">Zürich &amp; Zug</span>
              <h1>Movement &amp; integrative health</h1>
              <p className="sub serif">For physical strength, a regulated nervous system and mental balance.</p>
              <p className="small">Reformer Pilates in Zurich and Zug.</p>
              <a href="/buchen" className="btn btn-lg">Book a class</a>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section className="manifesto">
          <div className="wrap">
            <p className="motto serif">Train not for the performance, but for your life.</p>
            <p className="text">Six reformers in Zürich, four in Zug. <strong>Small groups, where we can see how you move</strong> and work with what your body needs right now. Whether this is your first time on a reformer or you train three times a week.</p>
          </div>
        </section>

        {/* BOOKING */}
        <section id="reformer" className="booking">
          <div className="wrap booking-inner">
            <div className="booking-text">
              <p className="eyebrow">Book Reformer Pilates</p>
              <h2>Your reformer class in Zürich &amp; Zug</h2>
              <p>You will find all classes, free places and prices in the online schedule. New sessions are added continuously. With a 5 or 10 class pass you book flexibly on the days that suit you.</p>
              <div className="booking-cta">
                <a href="/buchen" className="btn btn-lg">Go to the schedule</a>
                <a href="mailto:info@studio-lumen.ch?subject=Reformer%20trial%20class" className="btn ghost">Request a trial class</a>
              </div>
            </div>
            <div>
              <details className="fold on-dark">
                <summary>How booking works</summary>
                <div className="fold-body">
                  <ol className="booking-steps">
                    <li><span>1</span> Open the schedule — booking runs right here on the website.</li>
                    <li><span>2</span> Log in, go to the schedule and then to the week view.</li>
                    <li><span>3</span> Pick a free slot and book it with the credit from your pass.</li>
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
              <p className="eyebrow">Classes</p>
              <h2>Reformer Pilates in small groups</h2>
              <p className="lead">Guided by health professionals, for complete beginners and regulars alike.</p>
            </div>


            <div className="panel is-active">
              <div className="panel-img"><img src="/bilder/reformer-weit.jpg" alt="Reformer training" /></div>
              <div>
                <h3>Reformer Pilates</h3>
                <p className="meta">Zürich &amp; Zug · small group</p>
                <p className="desc">Reformer training in small groups, at two locations. Barefoot or in grip socks, in small groups with personal attention. The guided movements and spring resistance make it gentle on the joints, for complete beginners and regulars alike.</p>
                <p className="price">Classes, prices and free places in the online portal.</p>
                <a href="/buchen" className="btn">Go to the schedule</a>
                <p className="panel-links">
                  <a href="mailto:info@studio-lumen.ch?subject=Privat%20oder%20Duettstunden">Request private or duet lessons</a>
                </p>
              </div>
            </div>




          </div>
        </section>

        {/* PREISE */}
        <section id="preise">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Prices</p>
              <h2>Passes and single classes</h2>
              <p className="lead">Reformer passes are valid in both Zürich and Zug. Booking and payment run directly through this website.</p>
            </div>

            <div className="price-groups">

              <div className="price-group">
                <h3>Reformer Pilates</h3>
                <p className="where">Zürich &amp; Zug</p>
                <table className="price-table">
                  <thead>
                    <tr><th>Pass</th><th>Valid for</th><th>Price</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="name">Trial class<span className="hint">For your first time on the reformer</span></td>
                      <td className="valid">1 week</td>
                      <td className="amount">CHF 35</td>
                    </tr>
                    <tr>
                      <td className="name">Single class</td>
                      <td className="valid">1 week</td>
                      <td className="amount">CHF 45</td>
                    </tr>
                    <tr>
                      <td className="name">5 class pass</td>
                      <td className="valid">5 months</td>
                      <td className="amount">CHF 215</td>
                    </tr>
                    <tr>
                      <td className="name">10 class pass</td>
                      <td className="valid">7 months</td>
                      <td className="amount">CHF 400</td>
                    </tr>
                    <tr>
                      <td className="name">20 class pass</td>
                      <td className="valid">12 months</td>
                      <td className="amount">CHF 760</td>
                    </tr>
                    <tr>
                      <td className="name">3 class pass<span className="hint">Voucher only</span></td>
                      <td className="valid">3 months</td>
                      <td className="amount">CHF 129</td>
                    </tr>
                  </tbody>
                </table>

                <details className="fold" style={{ marginTop: "26px" }}>
                  <summary>Reduced rates <span className="price-tag">Young members</span></summary>
                  <div className="fold-body">
                    <p className="price-note" style={{ marginTop: "0", marginBottom: "18px" }}>For young members aged 16 to 24.</p>
                    <table className="price-table">
                      <thead>
                        <tr><th>Pass</th><th>Valid for</th><th>Price</th></tr>
                      </thead>
                      <tbody>
                        <tr><td className="name">Trial class</td><td className="valid">1 week</td><td className="amount">CHF 25</td></tr>
                        <tr><td className="name">Single class</td><td className="valid">1 week</td><td className="amount">CHF 40</td></tr>
                        <tr><td className="name">5 class pass</td><td className="valid">5 months</td><td className="amount">CHF 195</td></tr>
                        <tr><td className="name">10 class pass</td><td className="valid">7 months</td><td className="amount">CHF 360</td></tr>
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>


            </div>

            <div className="price-actions">
              <a href="/abos" className="btn">Order a pass</a>
              <a href="/buchen" className="btn ghost">Go to the schedule</a>
            </div>
          </div>
        </section>

        {/* ERSTER BESUCH */}
        <section className="benefits tight">
          <div className="wrap">
            <details className="fold">
              <summary>Your first visit</summary>
              <div className="fold-body">
                <div className="firstvisit-grid">
                  <div>
                    <h4>What to wear</h4>
                    <p>Comfortable clothes you can move freely in. On the reformer you train barefoot or in grip socks.</p>
                  </div>
                  <div>
                    <h4>If you have never been on a reformer</h4>
                    <p>That is no problem at all. The classes are for beginners and regulars, and in the small group we show you every exercise. The trial class is a good place to start.</p>
                  </div>
                  <div>
                    <h4>How to book</h4>
                    <p>Right in the schedule on this website. You pick your slot and book it with the credit from your pass.</p>
                  </div>
                  <div>
                    <h4>How the training works</h4>
                    <p>Gentle on the joints, with guided movements and spring resistance. In small groups, so that we can give you personal attention.</p>
                  </div>
                  <div>
                    <h4>If something hurts</h4>
                    <p>Tell us before the class. We will adapt the exercises.</p>
                  </div>
                  <div>
                    <h4>Still have questions?</h4>
                    <p>Write to info@studio-lumen.ch. We are happy to answer before your first session.</p>
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
              <summary>What regular Pilates does</summary>
              <div className="fold-body">
                <div className="benefit-grid">
                  <div>Targeted strengthening of the deep abdominal and back muscles</div>
                  <div>Stronger core musculature</div>
                  <div>Stabilisation of the lower spine</div>
                  <div>Back pain can be reduced</div>
                  <div>Lasting upright posture</div>
                  <div>Relief for throat, neck and shoulders</div>
                  <div>Pelvic floor strengthening</div>
                  <div>Prevention of osteoporosis and osteoarthritis</div>
                  <div>Improved mobility and circulation</div>
                  <div>Better body awareness and coordination</div>
                </div>
                <p className="fold-quote serif">“In 10 sessions you will feel the difference, in 20 you will see the difference, in 30 you will have a whole new body.” <span>Joseph Pilates</span></p>
              </div>
            </details>
          </div>
        </section>

        {/* GALERIE */}
        <section id="galerie">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Gallery</p>
              <h2>A look inside the studio</h2>
            </div>
            <div className="gallery-grid">
              <a href="/bilder/reformer-wall.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-wall.jpg" alt="Reformer training wall" /></a>
              <a href="/bilder/reformer-frau3.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-frau3.jpg" alt="Reformer Training" /></a>
              <a href="/bilder/reformer-step.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-step.jpg" alt="Reformer Step" /></a>
              <a href="/bilder/reformer-ring.jpg" target="_blank" rel="noopener"><img src="/bilder/reformer-ring.jpg" alt="Reformer with Pilates ring" /></a>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">About us</p>
              <h2>Personal. Skilled. With passion.</h2>
              <p className="lead">Our team guides you with expertise and a genuine love of movement, on your way to more health, strength and wellbeing.</p>
            </div>

            <div className="team-grid">
              <div className="team-photo"><img src="/bilder/owner-portrait-4x5.jpg" alt="Nadine Hofer" /></div>
              <div>
                <h3>Nadine Hofer</h3>
                <p className="role">Owner</p>
                <p className="team-bio">I founded Studio Lumen because I wanted to teach Pilates in small groups — with time for every single person, instead of in crowded halls.</p>
                <details className="fold">
                  <summary>More about me</summary>
                  <div className="fold-body">
                    <p className="team-bio">I most enjoy working with people who are just starting out, and with those coming back after an injury. Both take patience and a careful eye.</p>
                    <p className="team-bio">Studio Lumen is meant to be a place where nobody feels they are falling behind. That is why the groups are small and the machines are assigned in advance.</p>
                  </div>
                </details>
                <details className="fold">
                  <summary>Qualifications</summary>
                  <div className="fold-body">
                    <ul className="quals">
                      <li>Certified Pilates rehab trainer</li>
                      <li>Reformer trainer</li>
                      <li>Certified movement educator</li>
                    </ul>
                  </div>
                </details>
              </div>
            </div>

            <div className="team-block">
              <h3 className="team-block-title">The team</h3>
              <p className="team-block-lead">Personal, skilled and passionate. Our team guides you with expertise and a genuine love of movement.</p>

              <div className="team-people">

                <article className="person">
                  <figure><img src="/bilder/team-aline.jpg" alt="Aline Keller" /></figure>
                  <h4>Aline Keller</h4>
                  <p className="role">Reformer trainer</p>
                  <details className="fold">
                    <summary>Find out more</summary>
                    <div className="fold-body">
                      <p>I like teaching the early classes best. Anyone lying on the reformer at seven has made a deliberate choice — you can feel it through the whole hour.</p>
                    </div>
                  </details>
                </article>

                <article className="person">
                  <figure><img src="/bilder/team-jana.jpg" alt="Jana Brunner" /></figure>
                  <h4>Jana Brunner</h4>
                  <p className="role">Reformer trainer</p>
                  <details className="fold">
                    <summary>Find out more</summary>
                    <div className="fold-body">
                      <p>What interests me most is posture in everyday life: what is left after the class, once you are back at a desk for eight hours.</p>
                    </div>
                  </details>
                </article>

                <article className="person">
                  <figure><img src="/bilder/team-elin.jpg" alt="Elin Vogt" /></figure>
                  <h4>Elin Vogt</h4>
                  <p className="role">Reformer trainer</p>
                  <p className="lang">Language: English</p>
                  <details className="fold">
                    <summary>Find out more</summary>
                    <div className="fold-body">
                      <p>I teach in English. In a group where not everyone shares a first language, the cues get shorter and more precise — which helps everybody.</p>
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
            <p className="serif">“Small groups, assigned machines, and someone who is actually watching.”</p>
          </div>
        </section>

        {/* ZWEI STANDORTE */}
        <section className="zug-band">
          <div className="wrap">
            <p className="eyebrow">Two locations</p>
            <h2>One pass, two studios</h2>
            <p>In Zürich and in Zug you train on the same pass. One schedule for both studios, and you book wherever suits you better on the day.</p>
            <p className="highlight">Six reformers in Zürich, four in Zug. Both studios are open and classes are running.</p>
            <div className="zug-cta">
              <a href="/buchen" className="btn">Go to the schedule</a>
            </div>
          </div>
        </section>

        {/* STANDORTE */}
        <section id="standorte" className="benefits">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Locations</p>
              <h2>Two studios in the region</h2>
            </div>
            <div className="loc-grid">
              <div className="loc">
                <div className="loc-img"><img src="/bilder/reformer-wall.jpg" alt="Zürich studio" /></div>
                <div className="loc-body">
                  <p className="tag">Reformer training</p>
                  <h3>Studio Lumen, Zürich</h3>
                  <p>Werkgasse 7<br />8004 Zürich</p>
                  <a className="route" href="https://www.google.com/maps/search/?api=1&amp;query=Werkgasse+7+8004+Zürich" target="_blank" rel="noopener">Open in maps</a>
                </div>
              </div>
              <div className="loc">
                <div className="loc-img"><img src="/bilder/zug-wand.jpg" alt="Zug studio" /></div>
                <div className="loc-body">
                  <p className="tag">Reformer training</p>
                  <h3>Studio Lumen, Zug</h3>
                  <p>Lindenhof 3<br />6300 Zug</p>
                  <a className="route" href="https://www.google.com/maps/search/?api=1&amp;query=Lindenhof+3+6300+Zug" target="_blank" rel="noopener">Open in maps</a>
                </div>
              </div>
            </div>
            <div className="section-head loc-detail">
              <p className="eyebrow">Zug studio</p>
              <h2>Bright, quiet and generous</h2>
              <p className="lead">Four reformers, plenty of daylight and space. Lindenhof 3 in Zug, a few minutes from the station.</p>
            </div>
            <div className="photo-strip">
              <a href="/bilder/zug-fenster.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-fenster.jpg" alt="Reformers by the window, Zug studio" /></a>
              <a href="/bilder/zug-wand.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-wand.jpg" alt="Reformer training wall, Zug studio" /></a>
              <a href="/bilder/zug-symmetrie.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-symmetrie.jpg" alt="Training room Zug" /></a>
              <a href="/bilder/zug-ringe.jpg" target="_blank" rel="noopener"><img src="/bilder/zug-ringe.jpg" alt="Pilates rings and balls, Zug studio" /></a>
            </div>
          </div>
        </section>

        {/* KONTAKT */}
        <section id="kontakt" className="contact">
          <div className="wrap">
            <div className="contact-strip">
              <div className="contact-item">
                <div className="ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></div>
                <h3>Write to us</h3>
                <p><a href="mailto:info@studio-lumen.ch">info@studio-lumen.ch</a></p>
              </div>
              <div className="contact-item">
                <div className="ico"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <h3>Drop by</h3>
                <p>Werkgasse 7, 8004 Zürich</p>
                <p>Lindenhof 3, 6300 Zug</p>
              </div>
            </div>

            <div className="contact-form-wrap">
              <details className="fold on-dark">
                <summary>Send a message</summary>
                <div className="fold-body">
                  <form action={sendContact}>
                    <input type="text" name="lastName" placeholder="Last name" required />
                    <input type="text" name="firstName" placeholder="First name" />
                    <input type="email" name="email" placeholder="E-mail" required />
                    <input type="text" name="phone" placeholder="Phone (optional)" />
                    <textarea name="message" rows={4} placeholder="Message" required></textarea>
                    <button type="submit" className="btn">Send</button>
                    {gesendet && <p className="note">Thank you, your message has reached us. We will be in touch.</p>}
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
              <p>Movement and integrative health in Zürich and Zug.</p>
            </div>
            <div className="foot-col">
              <h4>Classes</h4>
              <ul>
                <li><a href="#angebot">Reformer Pilates</a></li>
                <li><a href="#preise">Prices</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Studio Lumen</h4>
              <ul>
                <li><a href="#team">About us</a></li>
                <li><a href="#team">The team</a></li>
                <li><a href="#galerie">Gallery</a></li>
                <li><a href="#standorte">Locations</a></li>
                <li><a href="#kontakt">Contact</a></li>
                <li><a href="mailto:info@studio-lumen.ch?subject=Job%20openings">Job openings</a></li>
              </ul>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <ul>
                <li>Terms, privacy policy and imprint are not part of this practice project.</li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <small>
              <strong>Fictional studio.</strong> This website is a practice
              project — names, prices, addresses and bookings are all made up.
              <a href="/demo">More about it</a>
            </small>
            <small><a href="/buchen?lang=en">Book a class</a> · <a href="/konto?lang=en">My account</a></small>
          </div>
        </div>
      </footer>
    </>
  )
}
