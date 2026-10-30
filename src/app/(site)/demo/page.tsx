import { getCurrentUser } from '@/lib/auth'
import SiteNav, { type NavUser } from '../components/SiteNav'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Demo guide · Studio Lumen',
  description: 'How to walk through this booking system, and what to look for.',
  robots: { index: false, follow: false },
}

/**
 * The guide to the demo.
 *
 * Someone arriving from a portfolio link would land on the home page
 * and have to work out for themselves what to look at — and might take
 * the demo data for real customers. This page heads off all three: it
 * says the studio is fictional, hands over two logins, and walks the
 * reader through the pages in order.
 *
 * Every step carries the *why*, not just the where. In a booking
 * system the hard part is not the screen but the rule behind it.
 *
 * Not indexed (`robots: noindex`): this accompanies the demo, it is
 * not part of the website.
 */
export default async function DemoGuide() {
  const user = await getCurrentUser()

  return (
    <>
      <SiteNav
        user={user as NavUser}
        lang="en"
        page="demo"
        langSwitch={false}
        inNewTab
      />

      <main id="top">
        <section className="tight">
          <div className="wrap guide">

            <p className="sender">A self-initiated practice project</p>
            <h1>A booking system you can actually click through</h1>

            <p>
              Studio Lumen is a <strong>reformer pilates studio that does not
              exist</strong>. I invented it so I could build a real booking
              system around a real business problem, instead of a to-do list
              with extra steps.
            </p>
            <p>
              The interesting part of a booking system is not the screens. It
              is the rules: what happens when a class fills up, when someone
              cancels four hours before, when a pass expires mid-booking, when
              the studio cancels a class with five people in it. Every page
              below has a note on <em>why</em> it behaves the way it does.
            </p>

            <div className="box important">
              <h2>Everything here is made up</h2>
              <p>
                The studio, the two locations, the four instructors, the
                prices, the customers and every booking are fictional. No real
                person, business or customer record appears anywhere in this
                project. The health notes you will see on customer profiles
                are invented examples, written to show how the feature
                handles sensitive data.
              </p>
            </div>

            <div className="box">
              <h2>Two logins</h2>
              <p>
                You need both: the system looks completely different from each
                side. Nothing you do can break it — the demo data is rebuilt
                from a script.
              </p>
              <div className="access">
                <span><strong>Customer:</strong> <code>kundin@demo.studio-lumen.ch</code></span>
                <span><strong>Studio (admin):</strong> <code>nadine@team.studio-lumen.ch</code></span>
                <span><strong>Password for both:</strong> <code>StudioLumen2026</code></span>
              </div>
            </div>

            <ol className="steps">

              <li className="step">
                <span className="nr">1</span>
                <div className="content">
                  <h2>Book a class as a customer</h2>
                  <p>
                    Sign in as the customer and open the schedule. Pick a
                    class, and you will be asked which reformer you want — the
                    machines are laid out the way they physically stand in the
                    room, mirror row first.
                  </p>
                  <p className="why">
                    Why: in a studio this size people have a favourite
                    machine, and the instructor needs to know who is where
                    before the class starts. A list of free slots cannot
                    answer that; a floor plan can.
                  </p>
                  <a href="/buchen" className="btn">Open the schedule</a>
                </div>
              </li>

              <li className="step">
                <span className="nr">2</span>
                <div className="content">
                  <h2>Find a full class and join the waitlist</h2>
                  <p>
                    At least three days in the schedule have a class with no
                    free machines. Open one: the booking button is gone and a
                    waitlist offer takes its place.
                  </p>
                  <p className="why">
                    Why: when a spot opens up, the first person on the
                    waitlist gets an exclusive offer with a deadline, rather
                    than everyone being emailed at once. The offer expires on
                    its own and moves to the next person — and it stops
                    offering anything in the last hours before the class,
                    because nobody can reorganise their day at that point.
                  </p>
                </div>
              </li>

              <li className="step">
                <span className="nr">3</span>
                <div className="content">
                  <h2>Cancel something, and watch the credit</h2>
                  <p>
                    In your account you will see your pass, the credits left
                    on it, and your bookings. Cancel one more than 24 hours
                    ahead and the credit comes back. Try one inside 24 hours
                    and it does not.
                  </p>
                  <p className="why">
                    Why: the late-cancellation rule is the single most
                    argued-about thing in a studio. It is enforced by the
                    system, with the same clock for everyone, and the
                    cancellation is recorded as on-time, late, or
                    studio-cancelled — so nobody has to remember who was told
                    what.
                  </p>
                  <a href="/konto" className="btn">My account</a>
                </div>
              </li>

              <li className="step">
                <span className="nr">4</span>
                <div className="content">
                  <h2>Now sign in as the studio</h2>
                  <p>
                    Sign out and sign in with the studio login. The same
                    calendar now shows who booked each class, which machine
                    they are on, which pass they are using and how many
                    credits are left on it.
                  </p>
                  <p className="why">
                    Why: the owner of a studio this size is also teaching. She
                    does not want an admin panel, she wants the same schedule
                    her customers see, with the answers already on it.
                  </p>
                  <a href="/unterricht" className="btn">Studio calendar</a>
                </div>
              </li>

              <li className="step">
                <span className="nr">5</span>
                <div className="content">
                  <h2>Add a class, then delete it</h2>
                  <p>
                    On the studio calendar there is a form to add a single
                    class. Add one, then open it and delete it again. Then try
                    to delete a class that already has people in it.
                  </p>
                  <p className="why">
                    Why: this was the feature that mattered most. A studio
                    owner who cannot change her own schedule will not adopt the
                    system, no matter how good the rest is. Deleting a class
                    with live bookings is refused — those have to be cancelled
                    first, which refunds the credits and notifies everyone.
                  </p>
                </div>
              </li>

              <li className="step">
                <span className="nr">6</span>
                <div className="content">
                  <h2>Take attendance by marking who was <em>absent</em></h2>
                  <p>
                    Open a class that has already happened. Everyone who
                    booked counts as present. There is one button per person,
                    and it marks them absent.
                  </p>
                  <p className="why">
                    Why: I built this the other way round first — tick each
                    person as present. That is five clicks to record the
                    normal case, which is that everyone showed up. Inverting
                    it means the instructor only touches the exceptions, and
                    classes nobody touched close themselves after twelve
                    hours.
                  </p>
                </div>
              </li>

              <li className="step">
                <span className="nr">7</span>
                <div className="content">
                  <h2>Look up a customer</h2>
                  <p>
                    The customer list shows who has a health note, but not
                    what it says. Open one profile and you get the contact
                    details, the note in full, the passes, which classes they
                    are booked into, and which ones they attended.
                  </p>
                  <p className="why">
                    Why: a health note is sensitive, and a list shows many
                    people at once to someone who is not yet looking at any
                    one of them. The full text appears on the profile and on
                    the class register — where the instructor is dealing with
                    that one person.
                  </p>
                  <a href="/kunden" className="btn">Customers</a>
                </div>
              </li>

            </ol>

            <div className="closing">
              <h2>What I deliberately did not build</h2>
              <ul className="bullets">
                <li>
                  <strong>Card payment.</strong> Passes are ordered in the
                  system and released by the studio once paid on site. Adding
                  a payment provider is a day of work; deciding what happens
                  to a credit when a refund is disputed is not.
                </li>
                <li>
                  <strong>Outgoing email.</strong> Every notification is
                  generated and stored, and visible in the admin, but nothing
                  is actually sent. The content and timing are the part worth
                  designing.
                </li>
                <li>
                  <strong>Terms, privacy policy, imprint.</strong> A fictional
                  studio has no legal entity to write them for.
                </li>
              </ul>

              <h2 style={{ marginTop: '28px' }}>How it is built</h2>
              <ul className="bullets">
                <li>
                  Next.js and Payload CMS in a single deployment — the
                  marketing site, the booking system and the admin are one
                  application, one database, one session.
                </li>
                <li>
                  SQLite locally, Postgres in production, chosen from the
                  connection string.
                </li>
                <li>
                  Everything time-related is computed in Europe/Zurich, not in
                  the server&rsquo;s timezone. A booking deadline that is an
                  hour off is worse than no deadline.
                </li>
                <li>
                  German and English from one typed dictionary; the language
                  carries from the marketing site into the booking system.
                </li>
                <li>
                  250 assertions over the booking, cancellation, waitlist,
                  pass and attendance rules.
                </li>
              </ul>
            </div>

          </div>
        </section>
      </main>
    </>
  )
}
