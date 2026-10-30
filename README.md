# Studio Lumen — booking system for a pilates studio that does not exist

A self-initiated practice project: a marketing website with the booking system
built **into** it rather than linked out to a third-party app. Next.js and
Payload CMS, one deployment, one database, one session.

**Studio Lumen is fictional.** The studio, its two locations, the four
instructors, the prices, the customers and every booking are invented. I made
up a business so I could build against a real problem instead of a to-do list
with extra steps.

Start at **`/demo`** — it explains what to click, in which order, and why each
screen behaves the way it does.

The interesting part of a booking system is not the screens. It is the rules:
what happens when a class fills up, when someone cancels four hours before,
when a pass expires mid-booking, when the studio cancels a class with five
people already in it. Those decisions are what the rest of this document is
about.

| Route | What is there |
|---|---|
| `/` | the website's home page (Angebot, Galerie, Team, Preise, Kontakt) |
| `/en` | the same, in English |
| `/demo` | the guide to the demo: what is worth clicking through |
| `/buchen` | the schedule; `/buchen/[id]` with floor plan and waitlist |
| `/abos` | prices and pass ordering |
| `/konto` | the customer's passes, bookings and cancellations |
| `/unterricht` | studio view: classes, register, cancellation |
| `/kunden` | customer list and profiles |
| `/verwaltung` | the owner's daily to-do: open pass orders |
| `/admin` | the full Payload admin |

## Running it

```bash
npm install
npm run dev
```

- Public site: http://localhost:3000
- Admin: http://localhost:3000/admin

The demo's two logins are printed on the `/demo` page. The first admin account
is created by the `/setup/admin` route.

## What is built

**Data model and admin.** The studio signs in at `/admin` and edits.

| Collection | What it holds |
|---|---|
| `users` | customer / instructor / admin, Young Member birth year, mat-Pilates flag |
| `studios` | Zürich and Zug, number of rows |
| `reformers` | machines with row/column position and status (active, maintenance) |
| `class-types` | class types, credit cost, whether machines are used |
| `session-series` | the rule for a recurring class: weekday, time, period |
| `sessions` | actual classes: type, instructor, studio, time, series reference |
| `bookings` | a booking: customer, class, machine, pass used, status, cancellation type |
| `abo-types` | the passes that can be bought: price, credits, validity, tier |
| `abos` | a customer's actual pass, credits left, expiry |
| `waitlist-entries` | the waitlist, with position and offer expiry |
| `notifications` | a log of the notifications sent, in readable text |
| `media` | images |

**Settings** (`/admin` → Buchungsregeln): the cancellation deadline (currently
24 hours), the waitlist's **sliding offer window**, the waitlist lock
threshold, and whether choosing a machine is allowed. The studio can change
these; nobody has to touch code.

**Seeded base data:**

```
Zürich  6 reformers   Row 1 (at the mirror): 2 machines
                      Row 2:                 2 machines
                      Row 3:                 2 machines

Zug     4 reformers   Row 1 (at the mirror): 2 machines
                      Row 2:                 2 machines
```

Pass types, including the reduced tier for Young Members and mat-Pilates
students. All prices are invented.

## The website and the booking are one system

The marketing site's markup comes from a static HTML page through a
**mechanical conversion**, so the approved design survives exactly;
`src/app/site.css` is an unchanged copy of that page's stylesheet (only the
image paths became `/bilder/`).

It gets its own route group (`src/app/(site)/`) and its **own root layout**,
because `site.css` uses class names (`.btn`, `.hint`, `.lead`) that also appear
in the booking system's `globals.css`. That way the two cannot collide: `/` and
`/buchen` never render on the same page. The price is a full page load when
moving between them, which is fine here.

Three things differ from the original static page:

- **navigation is a shared component** (`(site)/components/SiteNav.tsx`) that
  knows whether you are signed in and shows your name; the static page's
  `DE | EN` switch lives here too, with the current language marked by
  `aria-current`
- booking goes to **our own `/buchen` page**, not to an external system
- the **contact form is real**: instead of a `mailto:` a server action takes
  it and saves it to the `contact-messages` collection, where the studio sees
  it in the admin

## Two languages: German and English

Elin teaches in English, so English is not decoration. The whole system — the
website and the booking alike — runs in two languages, and a visitor switches
with one click.

**The marketing site has two real routes**, because search engines need to see
them: `/` in German and `/en` in English.

The English page was produced from the static English HTML through the **same
mechanical conversion** as its German counterpart — the rendered DOM matches
tag for tag, only the text differs. It is a separate route group
(`src/app/(site-en)/`), because `<html lang>` can only be set in a root layout.
`site.css` is shared and unchanged.

**The booking system runs on a single route**, and the `lang` cookie decides
the language: those pages sit behind a login and a database, and duplicating
that is pointless.

The order in which the language is chosen (`src/lib/lang.ts`):

1. the `lang` cookie — written by the language switch, or by the middleware
   when someone lands on `/en` (so from `/en`, `/buchen` opens in English too);
2. the signed-in user's `users.language` field — this is what carries the
   choice onto another machine;
3. German.

The booking system's switch is a server action (`(frontend)/actions.ts`), not a
plain link: besides the cookie it also saves `users.language`, so
**notification emails go in the recipient's language** — if the owner cancels a
class in German, an English-speaking customer still gets the notice in English.

All wording lives in one dictionary (`src/lib/i18n.ts`), with the German and
English version under each key. The keys are typed and cannot be mistyped. The
`src/lib` layer's error messages also return a key rather than a finished
sentence — translation happens on the page, where the language is known.

**What deliberately does not translate:** names that come from the database —
the passes (`5er Abo`), the class types (`Reformer Flow`) and the studios'
cities. Those are data, not interface text; making them bilingual would mean an
English field on the collections. That is a product decision, not an unfinished
one.

## A bug worth recording: the owner among the customers

`nadine@demo.studio-lumen.ch` is the address of **Nadine Hofer's instructor
account**. `/setup/demo-data` used to want the main demo customer at that same
address, so it did not create a new customer at all: it hung a customer pass on
the instructor's account — which is how Nadine ended up among the customers.

Fixed by:

- giving the demo customer its own, collision-free address (`sandra@demo…`);
- making the demo data's `ensure()` function **refuse** to touch an address
  that does not belong to a customer, so it can never overwrite an instructor
  account again;
- **deleting** the `/setup/fix-teachers` route. That was a one-off recovery
  which turned every instructor in the `@demo.studio-lumen.ch` domain into a
  customer — today it would have demoted the owner herself.

A second instance of the same class of bug: `/setup/teachers` wrote the
`instructor` role over everyone it processed, including the owner's account,
which is an admin. An innocent re-run therefore removed her admin rights
silently — exactly the rights without which she cannot create a class. It now
leaves an existing admin's role alone.

## Database

Locally an **SQLite** file (`studio-lumen.db`), needing no external account; on
Vercel, Postgres. **No code change is required**: `src/payload.config.ts`
chooses the adapter from `DATABASE_URI` — anything starting with `postgres://`
is Postgres, everything else an SQLite file.

## Recurring classes

One class = one `sessions` record, because bookings attach to that. The
`session-series` is only the **rule**: "every Monday 09:00 in Zürich, from here
to here". After saving, `/setup/series?id=…` generates the missing classes; it
is re-runnable and does not duplicate existing ones.

The time is computed **from Swiss local time**, so it does not slip at the
daylight saving change: "every Monday 09:00" is 09:00 all year.

When editing a class that came from a series, the admin asks what the change
applies to (`Änderung gilt für`):

| Choice | What happens |
|---|---|
| **Nur diese Lektion** | only this class changes, and it **detaches** from the series (`detached`) — a later series-level change will not overwrite it |
| **Diese und alle künftigen Lektionen der Serie** | this and every later, non-detached class takes over the type, studio, instructor, duration, status and **time of day** (each keeps its own date), and the series rule is updated too |

This is the same convention Mariana Tek, Punchpass and Arketa use. Existing
bookings follow the change automatically, because they point at the same class
record.

## The language of a class

Classes are **60 minutes**.

Language is a property of the **instructor**, because in practice that is what
decides who leads a class:

| Instructor | Language |
|---|---|
| Elin | EN |
| Nadine, Aline, Jana | DE/EN |

It lives in `users.teachingLanguages` and appears on every class in the
schedule (`DE`, `EN` or `DE/EN`). Changing an instructor's languages **carries
to all their classes immediately** — there is nothing to edit one by one.

An individual class can differ: `sessions.languages` overrides the
instructor's. Left empty, the instructor's languages apply again. This is why
the language is not copied into every class record: otherwise taking on a new
instructor would mean editing 48 classes.

If an instructor has no language set, no language marker appears in the
schedule — it does not block booking.

## Attendance and no-shows

A **late cancellation** and a **no-show** are two separate facts, because they
are handled differently:

| Fact | Where it shows |
|---|---|
| cancelled in time | `cancellationType = 'in_time'`, credit returns |
| cancelled late | `cancellationType = 'late'`, credit forfeited |
| never told us, never came | `status = 'no_show'` |
| was there | `status = 'attended'` |

The cancellation type is stored separately rather than inferred from "did the
credit come back", so that a goodwill refund by the studio does not erase the
fact.

**The marking is inverted, and that is the point.** It used to work the other
way round: closing a class marked everyone as a no-show, and the instructor
corrected each person who had been there. But the normal case is that someone
who booked turns up — out of five spots, one goes empty maybe once a month. So
the instructor was making five clicks to record nothing.

Now `closeSession` sets every still-open booking to `attended`, and the
instructor's only job is to mark who was **absent**, with one button per row
that can be undone. Classes nobody touched close themselves after
`AUTO_CLOSE_HOURS` (12 hours), carried by the same lazy scheduler as the
waitlist. `getReliability` aggregates the four numbers per customer. The code
is in `src/lib/attendance.ts`.

## Notifications

Every email is composed in `src/lib/notify.ts`, in one place. Sending **and**
logging happen in one call: the text also goes into the `notifications`
collection, so the admin can look up who received what — in practice more
useful than searching a sent folder afterwards, and the tests check it too.

| Type | When |
|---|---|
| `waitlist_offer` | a freed-up spot is offered, with the deadline and a booking link |
| `waitlist_released` | shortly before the class: the spot is open to everyone |
| `session_changed` | the time, instructor or studio changed |
| `session_cancelled` | the studio cancelled the class, with the reason and what happens to the credit |

**What is missing: actual delivery.** No email provider is configured, so
Payload writes the message to the console and the log records it as
`Nur protokolliert`. Going live needs an adapter in `payload.config.ts`
(`@payloadcms/email-resend`, say) and `EMAIL_ADAPTER_READY=true` in the
environment — the call sites do not change.

`session_changed` does not fire on every save: editing the duration, the note
or an internal field is not worth an email, and anyone who cancelled gets
nothing. The conditions are in `src/lib/session-notice.ts`.

## Waitlist

The offer window is **not fixed**: it gets shorter the closer the class is,
otherwise a spot freed two hours before a class would sit idle for six hours.
The defaults (adjustable from the admin):

| Time until the class | Time to respond |
|---|---|
| more than 48 hours | 12 hours |
| 13–48 hours | 4 hours |
| under 13 hours | 20 minutes |

Within `waitlistLockHours` (1 hour by default) nobody gets an individual offer
any more: the spot opens to everyone at once. There is only **one** live offer
at a time; when it expires, the next person gets it.

Offering happens in two places: **immediately on cancellation** (called by the
`/konto` cancel action), and **from the scheduler, by sweeping** — because not
every opening goes through a cancellation: a machine comes back from
maintenance, an admin deletes a booking, or an offer attempt fails once.

```bash
curl -X POST http://localhost:3000/setup/waitlist-tick   # expire + sweep
```

In production a Vercel Cron calls this. The code is in `src/lib/waitlist.ts`.

On the customer's side it appears on `/buchen/[id]`: on a full class an
"Auf die Warteliste" button that **says in advance how long they would have to
respond** if a spot opened up now. When their turn comes, the offer appears at
the top of the page with its deadline, and the booking button changes to
"Platz übernehmen".

## Studio view

`/unterricht` — the calendar, with every class. Every instructor sees every
class, not only their own: four of them teach and they cover for each other,
and whoever steps in needs to know beforehand who is coming. The badge shows
how full a class is (`3/5`), not how many spots are free.

An admin also gets a form here to **create a single class**, and a delete
button on the class's own page. Deleting is refused while there are live
bookings — those have to be cancelled first, which refunds the credits and
notifies everyone.

`/unterricht/[id]` — the register:

- participants' names, their machine, their pass and the credits left on it
- health notes, Young Member and mat-Pilates markers
- for a past class, one **"fehlt"** button per row, which can be undone
- the waitlist, with the deadline of any running offer
- **cancellation**: with a reason, plus a separate button for the
  "too few participants" case

`/kunden` — the customer list and profiles: contact details, health notes,
passes with credits, which classes they are booked into and which ones they
attended, plus reliability figures. The list shows only *that* a health note
exists, never its content: the full text appears on the profile and on the
register, where the instructor is dealing with that one person.

Authorisation is re-checked in every server action (`authorize()` in
`actions.ts`), not only when rendering the page — otherwise hand-written form
data could be used to interfere with someone else's class.

## Cancellation by the studio

`src/lib/studio.ts`. Under the studio's terms, when Studio Lumen cancels, the
credit **always comes back** — regardless of the 24-hour rule, which applies
only to the customer's own cancellation. There is no refund in money, only a
credit.

One cancellation, one transaction: every active booking becomes `cancelled`
with `cancellationType = 'by_studio'`, the credit is written back, the class
becomes `cancelled` with the reason in `cancellationReason` (the `note`, which
is the studio's own remark, is left untouched), and the waitlist is withdrawn.
The notification goes out **after** the transaction, so we never send mail
about a change that did not end up being saved. Re-runnable: it does not write
the credit back a second time on an already cancelled class.

"Too few participants" (a minimum of 2) is a separate function that refuses to
cancel if the numbers did come together after all.

## Booking

- `/buchen` — the schedule by day, filterable by studio
- `/buchen/[id]` — one class, with a **floor plan**: the mirror at the top and
  the machines below it in their real row/column layout. Free, taken and
  under-maintenance machines are marked differently
- `/login` — sign in with email and password
- `/konto` — passes, upcoming classes, cancellation, history

The rules are in `src/lib/booking.ts`:

| Rule | Where |
|---|---|
| Cancel more than 24 hours ahead → credit returns | `cancelBooking` |
| Cancel inside 24 hours → credit forfeited, recorded as "zu spät" | `cancelBooking` |
| A taken machine cannot be booked again | `createBooking` |
| The same customer cannot book twice | `createBooking` |
| No booking during a closure period | `isClosed` |
| An expired pass, or one with no credits, does not work | `findUsableAbo` |

The cancellation deadline is set from the admin (Buchungsregeln), not in code.

## Seeding and refreshing the demo data

The order matters, because each route builds on the previous one's result. The
password should be the same one printed on the `/demo` page.

```bash
BASE=http://localhost:3000
PW='StudioLumen2026'
J="content-type: application/json"

curl -X POST $BASE/setup/seed                               # studios, machines, pass and class types
curl -X POST $BASE/setup/teachers     -H "$J" -d "{\"password\":\"$PW\"}"
curl -X POST $BASE/setup/sessions                           # the schedule — needs an instructor, hence after teachers
curl -X POST $BASE/setup/teachers     -H "$J" -d "{\"password\":\"$PW\"}"   # share the classes out now that they exist
curl -X POST $BASE/setup/demo-zugang  -H "$J" -d "{\"password\":\"$PW\"}"   # the two demo logins, with admin rights
curl -X POST $BASE/setup/demo-data    -H "$J" -d "{\"password\":\"$PW\"}"   # bookings, full classes, waitlist
curl -X POST $BASE/setup/demo-profilok                      # health note, Young Member, mat customer
curl      $BASE/setup/demo-check                            # is the demo ready
```

`teachers` appears twice on purpose: the first call creates the instructors
(without them `sessions` has nobody to assign), and the second shares the
already generated classes out between them, so the demo has both German and
English classes.

All of them are **re-runnable**. The routes only open with `ALLOW_SEED=true` —
that variable must not be set in production.

If you also want your own admin account for the Payload admin, four fields are
required:

```bash
curl -X POST $BASE/setup/admin -H "$J" \
  -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
```

### Why it needs refreshing at all

The demo data is **tied to time**: the full class and the waitlist always land
on the nearest classes. After a few days those slide into the past, and the two
strongest points of the demo become impossible to show.

### The six checks

| | What it looks at |
|---|---|
| 1 | no test residue (`@test.local` accounts, `TEST` classes, series) |
| 2 | the people list is in order |
| 3 | there are enough future classes |
| 4 | there is a **full class with a waitlist**, on more than one day |
| 5 | there is an open pass order for the Verwaltung page |
| 6 | the demo customer can book |

`/setup/demo-check` only reads, so it runs against production too, and needs no
`ALLOW_SEED`.

## Testing

```bash
curl -X POST http://localhost:3000/setup/test
```

**This does not run against the production database.** The suite creates test
customers and test classes, and in October 2026 one such run left 95 test
accounts and 80 test classes in the live database — the demo would have shown
customers called "Kundin Nr140" and an instructor called "Serien Nr169". Since
then `src/lib/guard.ts` checks whether `DATABASE_URI` points at Postgres and,
if so, refuses with a `409`. Getting round it takes deliberate effort
(`FORCE_TEST_ON_PRODUCTION=true`), and is not worth it.

**250 assertions** run, across 34 topics. Every case creates its own data, and
all test data is deleted at the start and end of a run, so the suite is
re-runnable and order-independent. It lives in `src/lib/test-suite.ts`.

Branches covered:

| Topic | What it checks |
|---|---|
| Booking | with and without a chosen machine (automatic assignment), credit deduction |
| Clashes | the same customer twice; another customer on a taken machine |
| Capacity | the room fills up exactly, then rejects |
| Passes | zero credits, expired, cancelled, no pass at all |
| Several passes | the one expiring soonest is used first |
| Class status | cancelled class, past class |
| Machines | another studio's machine, a machine in maintenance, reduced capacity |
| Closures | other class type, other studio, own class type, unrestricted |
| Cancellation | outside and inside 24 hours, cancelling twice, someone else's booking |
| Rebooking | after a cancellation the machine is free again |
| Bad input | non-existent class and booking ids |
| Waitlist window | all four steps, and that the window really does shorten |
| Waitlist | only on a full class; ordering; joining twice; leaving; someone else's entry |
| Offering | goes to the first in line; only one at a time; only they can claim it; not after expiry |
| Expiry | passes to the next person; inside the lock window everyone may book |
| Attendance | late vs. in-time cancellation; closing a class; correcting it; statistics |
| Series | generation, no duplication, correct weekday and time of day |
| Daylight saving | 09:00 stays 09:00 both before and after the March change |
| Series editing | "this one" detaches; "this and future" propagates; earlier ones untouched |
| Booking follow-through | after a series change the booking stays active and follows the time |
| Sweeping | a spot freed outside a cancellation is offered too, but not twice |
| Emails | offer, release, time and instructor change, cancellation wording |
| Non-notification | a duration change and cancelled participants get no email |
| Studio cancellation | credit always returns, cancellation type, reason in its own field, note untouched |
| Minimum numbers | refuses when there are enough participants, cancels and notifies when there are not |

Every rejected case also checks that **the credit was not deducted**.

Test data is marked by an `@test.local` email and `note = 'TEST'` on classes.
Clean-up deletes only those and never touches real data.

## Ordering a pass without a payment provider

The modelled payment is **cash on site or bank transfer** (QR invoice, 10
days). So ordering is not paying:

1. the customer orders on `/abos` and picks a payment method
2. the pass goes to `pending` — **it cannot be used to book**, because
   `findUsableAbo` only considers `active` passes
3. they receive a confirmation email with the payment instructions (the text
   is in the Buchungsregeln setting, without bank details — the studio fills
   those in)
4. once the money arrives, the studio releases it with one button on
   `/verwaltung`, and the customer is notified

**Validity runs from the release**, not from the order, so waiting does not eat
into the pass.

The reduced tier (Young Member 16–24, mat-Pilates students) is only shown to
someone who qualifies, and the order checks it server-side as well — so nothing
has to be turned down afterwards. The voucher pass can only be ordered with a
voucher.

When Stripe is added, it only opens a third route to activation
(`paymentMethod: 'online'`, immediate `confirmPayment`); the model stays.

## What is not built

1. **Email delivery** — an adapter (Resend or SMTP) in `payload.config.ts`.
   The wording and the sending logic are done; only posting them is missing.
2. **Card payment and Stripe**
3. **Sign-in by email link** (currently password only)
4. **The website's text in Payload**, so the studio could edit it
5. **A per-minute Vercel Cron** for the waitlist (see below for why the lazy
   scheduler carries it today)

## Known environment limits

- The `payload` CLI (`generate:types`, `generate:importmap`) **does not run
  under Node 24** because of an undici conflict. Use Node 20 or 22 if you need
  it. Development does not require it, and the admin works without it.
- Payload's SQLite adapter asks about schema changes (a rename or a new
  column) **interactively**, and the question never appears if the server is
  not running in a terminal. Rename a field and the boot hangs. Workaround: do
  not delete the old field, leave it with `admin: { hidden: true }` (as
  `waitlistOfferHours` is), or add the column by hand with
  `sqlite3 studio-lumen.db` and restart.
- npm may block packages' install scripts here. `sharp` and `esbuild` ship
  prebuilt binaries, so they work regardless.

## Deploying to Vercel

What you need: a **GitHub** account (the code goes there), a **Vercel**
account, and a **Postgres** database — [Neon](https://neon.tech)'s free plan is
enough.

```bash
# 1. the code to GitHub
git add -A && git commit -m "Website and booking system"
git remote add origin git@github.com:<user>/studio-lumen.git
git push -u origin main
```

2. In Neon, create a project and copy the connection string
   (`postgresql://…?sslmode=require`).

3. On Vercel, *Add New → Project* and pick the repository. Environment
   variables (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URI` | the Neon connection string |
| `PAYLOAD_SECRET` | `openssl rand -base64 32` |
| `SITE_URL` | the Vercel address, e.g. `https://studio-lumen-demo.vercel.app` |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `ALLOW_SEED` | `true` **for the first seeding only**, then delete it |

4. After the first deploy, seed the data with the sequence under
   "Seeding and refreshing the demo data" above, pointed at the live address.

5. **Delete the `ALLOW_SEED` variable** and trigger another deploy. That closes
   the `/setup/*` routes.

### Scheduling for the waitlist

On Vercel's **free plan a cron job may run only once a day**, and a per-minute
schedule is rejected at deploy time. A waitlist offer, however, expires in
minutes, so the real beat comes from `maybeTick()`: whoever opens the schedule
also turns the crank, at most once a minute. The time of the last run lives in
the Buchungsregeln global rather than in memory, because serverless instances
do not share memory. The same tick also closes classes that finished long ago.

Alongside it, `vercel.json` has a **daily** cron (`/api/cron/waitlist`, guarded
by `CRON_SECRET`) as a safety net for when nobody visits the site. On a paid
plan it can be switched to per-minute, and then the lazy round becomes the
backup.

**You cannot put comments in `vercel.json`**: JSON has no comments, and Vercel
rejects fields its schema does not recognise (`INVALID_VERCEL_CONFIG`), so the
deploy fails in the first second. Hence the explanation lives here, not in the
file.

### What the demo deliberately does not have

- **No online payment.** Ordering a pass models paying on site or by transfer.
- **Emails are not sent.** No email provider is configured; Payload writes to
  the console and the `notifications` log records the text with the status
  "Nur protokolliert". Every message can be read back in the admin.
- **The site's text still lives in code**, not in Payload — the studio can edit
  the schedule, the passes and the people, but not the marketing copy yet.
