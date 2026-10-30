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

> The detailed notes below are in Hungarian — they are the working log I kept
> while building this, kept as-is rather than translated after the fact.

---

## Studio Lumen · Weboldal és foglalórendszer (prototípus)

Next.js + Payload CMS. A **marketing weboldal**, a **foglalórendszer** és az
**admin** egy projekt, egy deploy, közös navigációval.

| Útvonal | Mi van ott |
|---|---|
| `/` | a weboldal nyitólapja (Angebot, Galerie, Team, Preise, Kontakt) |
| `/demo` | útmutató a demóhoz: mit érdemes végigkattintani |
| `/buchen` | órarend, `/buchen/[id]` teremtérképpel és várólistával |
| `/abos` | árak és abo-megrendelés |
| `/konto` | az ügyfél abo-i, foglalásai, lemondás |
| `/unterricht` | oktatói nézet: saját órák, jelenlét, lemondás |
| `/verwaltung` | Nadine napi teendői: nyitott abo-megrendelések |
| `/admin` | a teljes Payload adminisztráció |

## Indítás

```bash
npm run dev
```

- Nyilvános oldal: http://localhost:3000
- Adminisztráció: http://localhost:3000/admin

A demó két belépése a `/demo` lapon van kiírva. Az első admin fiókot a
`/setup/admin` útvonal hozza létre.

## Mi van kész

**Adatmodell és admin.** Nadine a `/admin` címen belép és szerkeszt.

| Gyűjtemény | Mit tárol |
|---|---|
| `users` | ügyfél / oktató / admin, Young Member évjárat, matten-résztvevő jelölés |
| `studios` | Zürich és Zug, sorok száma |
| `reformers` | gépek sor/oszlop pozícióval és állapottal (aktív, karbantartás) |
| `class-types` | óratípusok, kreditköltség, géphasználat |
| `session-series` | ismétlődő óra szabálya: hétköznap, időpont, időszak |
| `sessions` | konkrét órák: típus, oktató, stúdió, időpont, sorozat-hivatkozás |
| `bookings` | foglalás: ügyfél, óra, gép, felhasznált abo, státusz, lemondás típusa |
| `abo-types` | megvásárolható abo-k, ár, kredit, érvényesség, tarifa |
| `abos` | ügyfél konkrét abo-ja, maradék kredit, lejárat |
| `waitlist-entries` | várólista sorrenddel és ajánlat-lejárattal |
| `notifications` | kiküldött értesítések naplója, olvasható szöveggel |
| `media` | képek |

**Beállítások** (`/admin` → Buchungsregeln): lemondási határidő (most 24 óra),
meddig előre lehet foglalni, a várólista **lépcsőzetes ajánlati ablaka**, a
várólista leállítási küszöbe, géphelyválasztás engedélyezése. Ezeket Nadine
állíthatja, nem kell kódot módosítani.

**Felvett alapadatok:**

```
Zürich  5 reformer   Reihe 1 (tükör előtt): 2 gép
                     Reihe 2:               3 gép

Zug  6 reformer   Reihe 1 (tükör előtt): 2 gép
                     Reihe 2:               2 gép
                     Reihe 3:               2 gép
```

Abo-típusok, a Young Member / matten-résztvevő kedvezményes sávval együtt.
Az árak kitaláltak.

## Alapadatok újrafelvétele

A `.env`-ben `ALLOW_SEED=true` mellett:

```bash
curl -X POST http://localhost:3000/setup/seed     # stúdiók, gépek, abo-k, óratípusok
curl -X POST http://localhost:3000/setup/admin \
  -H 'content-type: application/json' \
  -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
```

Mindkettő újrafuttatható, ami már létezik, azt kihagyja.
**Élesítés előtt az `ALLOW_SEED` sort törölni kell a környezetből.**

## A weboldal és a foglalás egy rendszer

A marketing oldal jelölése a statikus `1_website_studio_lumen/index.html`-ből
származik, **gépi átalakítással**, hogy a jóváhagyott design pontosan
megmaradjon; a `src/app/site.css` is annak a `styles.css`-ének változatlan
másolata (csak a képek útvonala lett `/bilder/`).

Saját route group (`src/app/(site)/`) és **saját gyökér-layout**, mert a
`site.css` olyan osztályneveket használ (`.btn`, `.hint`, `.lead`), amelyek
a foglalórendszer `globals.css`-ében is szerepelnek. Így a kettő nem tud
összeakadni: a `/` és a `/buchen` soha nem ugyanazon a lapon renderelődik.
Cserébe a kettő közötti váltás teljes lapbetöltés — a mintához ez rendben van.

Három dolog változott az eredetihez képest:

- a **navigáció közös komponens** (`(site)/components/SiteNav.tsx`), ami
  tudja, hogy be vagy-e jelentkezve, és a nevedet mutatja; a statikus
  oldal `DE | EN` váltója is itt van, az aktuális nyelv `aria-current`-tel
- a foglalás a **saját `/buchen` lapunkra** megy, nem külső rendszerbe
- a **kapcsolati űrlap valódi**: a `mailto:` helyett szerver action veszi át,
  és a `contact-messages` gyűjteménybe menti, ahol Nadine látja az adminban

Ha a statikus oldalon változik a tartalom, az átalakítás nem fut le
magától — ott is, itt is módosítani kell. Hosszabb távon a szöveg Payloadba
költözik, és akkor már csak egy helyen lesz.

## Két nyelv: német és angol (kész)

Elin angolul tart órát, ezért az angol nem díszlet. Az egész rendszer
— a weboldal és a foglalás is — két nyelven megy, és a látogató egyetlen
kattintással vált.

**A marketing oldalnak két valódi útvonala van**, mert azt a keresőknek is
látniuk kell:

| németül | angolul |
|---|---|
| `/` | `/en` |
| `/naturheilkunde` | `/en/naturheilkunde` |

Az angol lapok a statikus `index-en.html` és `naturheilkunde-en.html`
fájlokból készültek, **ugyanazzal a gépi átalakítással**, mint a német
párjuk — a renderelt DOM-juk tagról tagra megegyezik, csak a szöveg más.
Külön route group (`src/app/(site-en)/`), mert a `<html lang>` csak
gyökér-layoutban adható meg. A `site.css` közös és változatlan.

**A foglalórendszer egyetlen útvonalon fut**, a nyelvet a `lang` süti
dönti el: azokat a lapokat bejelentkezés és adatbázis mögött szolgáljuk
ki, azokat fölösleges megduplázni.

A nyelv kiválasztásának sorrendje (`src/lib/lang.ts`):

1. a `lang` süti — ezt a nyelvváltó írja, vagy a middleware, ha valaki
   a `/en` lapra lép (így a `/en`-ről a `/buchen` is angolul nyílik);
2. a bejelentkezett felhasználó `users.language` mezője — eddig semmi
   nem használta, innentől ez tartja meg a választást másik gépen is;
3. végül a német.

A foglalórendszer váltója szerver action (`(frontend)/actions.ts`), nem
sima hivatkozás: a süti mellett a `users.language` mezőt is menti, így az
**értesítő levelek is a címzett nyelvén** mennek — ha Nadine németül mond
le egy órát, a Elin óráira járó angol ügyfél akkor is angolul kapja.

Minden szöveg egy szótárban van (`src/lib/i18n.ts`), kulcsonként a német
és az angol változattal. A kulcsok típusosak, elgépelni nem lehet őket. A
`src/lib` rétegének hibaüzenetei is kulcsot adnak vissza, nem kész mondatot
— a fordítás a lapon történik, ott, ahol a nyelv ismert.

**Ami szándékosan nem fordul:** az adatbázisból jövő nevek — az abók
(`5er Abo`), az óratípusok (`Reformer Flow`) és a stúdiók városai. Ezek
adatok, nem felületi szövegek; ha kétnyelvűek legyenek, a kollekciókba
kell egy angol mező. Ez termékdöntés, nem fejlesztési maradék.

## Nadine az oktatók között

A `nadine@demo.studio-lumen.ch` címen **Nadine Hofer oktató** fiókja
ül. A `/setup/demo-data` korábban ugyanerre a címre akarta a fő
demó-ügyfelet létrehozni, ezért nem új ügyfelet csinált, hanem az oktató
fiókjára akasztott egy ügyfél-abót — így került Nadine az ügyfelek közé.

Javítva:

- a demó-ügyfél saját, ütközésmentes címet kapott (`sandra@demo…`);
- a demó-adat `ensure()` függvénye **hibát dob**, ha a címen nem ügyfél
  ül, tehát oktatói fiókot többé nem tud felülírni;
- a `/setup/fix-teachers` útvonal **törölve**. Ez egy egyszeri
  helyreállítás volt, ami a `@demo.studio-lumen.ch` tartomány minden
  oktatóját ügyféllé alakította — mára pont a tulajdonost fokozta volna le.
  A saját leírása szerint is törölhető volt a futtatása után.

Ha az éles adatbázisban Nadine ügyfélként szerepel, azt az adminban
érdemes rendbe tenni: a szerepe legyen `instructor`, és a hozzá tartozó
ügyfél-abót lehet törölni.

## Adatbázis

Prototípus: helyi **SQLite** (`studio-lumen.db`), nem kell hozzá külső fiók.
Vercelen Postgres. **Nem kell kódot módosítani**: a `src/payload.config.ts`
a `DATABASE_URI` alapján választ adaptert — ami `postgres://`-sel kezdődik,
az Postgres, minden más SQLite fájl.

## Ismétlődő órák (kész)

Egy óra = egy `sessions` rekord, mert a foglalások ahhoz kötődnek. A
`session-series` csak a **szabály**: „minden hétfő 09:00 Zürich, ettől
eddig". Mentés után a `/setup/series?id=…` legenerálja a hiányzó órákat;
újrafuttatható, a meglévőket nem duplikálja.

Az időpont **svájci helyi időből** számolódik, ezért a nyári időszámítás
váltásakor nem csúszik el: „minden hétfő 09:00" egész évben 09:00.

Egy sorozatból származó óra szerkesztésénél az admin megkérdezi, mire
vonatkozik a változás (`Änderung gilt für`):

| Választás | Mi történik |
|---|---|
| **Nur diese Lektion** | csak ez az óra változik, és **leszakad** a sorozatról (`detached`) — a későbbi sorozat-szintű módosítás nem írja vissza |
| **Diese und alle künftigen Lektionen der Serie** | ez és minden későbbi, le nem szakított óra átveszi a típust, stúdiót, oktatót, hosszt, állapotot és a **napszakot** (a dátumát mindegyik megtartja), és a sorozat szabálya is frissül |

Ez ugyanaz a konvenció, amit a Mariana Tek, a Punchpass és az Arketa is
használ. A meglévő foglalások automatikusan követik a változást, mert
ugyanarra az óra-rekordra mutatnak.

## Az óra nyelve (kész)

Az órák **60 percesek**.

A nyelv az **oktató tulajdonsága**, mert a gyakorlatban az dönti el, ki
vezeti az órát:

| Oktató | Nyelv |
|---|---|
| Elin | EN |
| Nadine, Aline, Jana | DE/EN |

A `users.teachingLanguages` mezőben áll, és az órarenden minden óránál
megjelenik (`DE`, `EN` vagy `DE/EN`). Ha Nadine módosítja egy oktató
nyelvét, az **az összes óráján azonnal átüt** — nem kell egyenként
szerkeszteni.

Egy-egy óra eltérhet: a `sessions.languages` mező felülírja az oktatóét.
Üresen hagyva ismét az oktató nyelvei érvényesek. Ezért nem másoljuk be a
nyelvet minden óra rekordjába: különben egy új oktató felvételekor 48 órát
kellene átírni.

Ha egy oktatónál nincs nyelv megadva, az órarenden egyszerűen nem jelenik
meg nyelv-jelölés — a foglalást nem akadályozza.

## Jelenlét és no-show (kész)

A **késői lemondás** és a **meg nem jelenés** két külön tény, mert másként
is kezeljük őket:

| Tény | Hol látszik |
|---|---|
| időben lemondta | `cancellationType = 'in_time'`, kredit visszajár |
| későn mondta le | `cancellationType = 'late'`, kredit elveszik |
| nem szólt, nem jött | `status = 'no_show'` |
| ott volt | `status = 'attended'` |

A lemondás típusát külön tároljuk, nem a „visszajárt-e a kredit"-ből
következtetjük, hogy a stúdió jóindulatú visszatérítése se törölje a tényt.

`closeSession` az óra után a maradék nyitott foglalásokat no-show-ra állítja;
az oktató ezt egyenként jelenlétre javíthatja (`markAttendance`). A
`getReliability` ügyfélre összesíti a négy számot. A kód a
`src/lib/attendance.ts`-ben van.

## Értesítések (kész, kézbesítés nélkül)

Minden levél a `src/lib/notify.ts`-ben készül, németül, egy helyen. A
küldés **és** a napló egy hívásban történik: a szöveg a `notifications`
gyűjteménybe is bekerül, így az adminban visszakereshető, hogy ki mit
kapott — ez a gyakorlatban többet ér, mint utólag a postafiókot keresni,
és a tesztek is ezt ellenőrzik.

| Típus | Mikor |
|---|---|
| `waitlist_offer` | felszabadult hely kiajánlása, a határidővel és a foglalási linkkel |
| `waitlist_released` | röviddel az óra előtt: a hely mindenki számára szabad |
| `session_changed` | megváltozott az időpont, az oktató vagy a stúdió |
| `session_cancelled` | a stúdió lemondta az órát, az okkal és a kredit sorsával |

**Ami hiányzik: a tényleges kézbesítés.** Nincs e-mail szolgáltató
beállítva, ezért a Payload a konzolra írja a levelet, a napló pedig
`Nur protokolliert` állapottal rögzíti. Élesítéshez egy adapter kell a
`payload.config.ts`-be (pl. `@payloadcms/email-resend`) és
`EMAIL_ADAPTER_READY=true` a környezetben — a hívások nem változnak.

A `session_changed` nem minden mentésre megy ki: a hossz, a hinweis vagy
egy belső mező átírása nem ér levelet, és aki lemondta, nem kap. A
feltételek a `src/lib/session-notice.ts`-ben vannak.

## Várólista (kész)

Az ajánlati ablak **nem fix**, hanem annál rövidebb, minél közelebb az óra —
különben egy felszabadult hely két órával az óra előtt 6 óráig parlagon
állna. Alapértelmezés (az adminból állítható):

| Mennyi idő van az óráig | Mennyi ideje van válaszolni |
|---|---|
| 48 óránál több | 12 óra |
| 13–48 óra | 4 óra |
| 13 óra alatt | 20 perc |

A `waitlistLockHours`-on (alapból 1 óra) belül már senkinek nem ajánlunk
egyedileg: a hely azonnal mindenki számára szabaddá válik. Egyszerre csak
**egy** élő ajánlat van; ha lejár, a következő ember kapja meg.

Kiajánlás két helyen történik: **lemondáskor azonnal** (a `/konto`
lemondás-actionje hívja), és az **ütemezőből söpréssel** — mert nem minden
felszabadulás megy lemondáson át: egy gép visszakerül karbantartásból, az
admin töröl egy foglalást, vagy a kiajánlás egyszer hibára fut.

```bash
curl -X POST http://localhost:3000/setup/waitlist-tick   # lejáratás + söprés
```

Élesben ezt egy percenkénti Vercel Cron hívja. A kód a
`src/lib/waitlist.ts`-ben van.

Az ügyfél oldalán a `/buchen/[id]` lapon jelenik meg: tele óránál egy
„Auf die Warteliste" gomb, ami **előre megmondja, mennyi ideje lenne
reagálni**, ha most szabadulna fel hely. Aki sorra kerül, annak a lap
tetején megjelenik az ajánlat a határidővel, és a foglalás gombja
„Platz übernehmen"-re változik.

## Oktatói nézet (kész)

`/unterricht` — az oktató a saját óráit látja, Nadine (admin) mindet.
Jelentkezők száma óránként, jövőbeli és elmúlt órák szétválasztva.

`/unterricht/[id]` — jelenléti lista:

- a résztvevők neve, a gépük és az állapotuk
- elmúlt óránál **da / fehlt** gomb minden sorhoz
- **„Lektion schliessen"**: a maradék nyitott foglalás no-show lesz
- akinek korábban volt no-show-ja vagy késői lemondása, annál ez a neve
  alatt jelzésként látszik
- a várólista, az éppen futó ajánlat határidejével
- **lemondás**: okkal, és egy külön gomb a „túl kevés jelentkező" esetre

A jogosultság minden server actionben újra ellenőrződik
(`authorize()` az `actions.ts`-ben), nem csak a lap megjelenítésénél —
különben kézzel írt form-adattal más órájához is hozzá lehetne szólni.

## Stúdió-oldali lemondás (kész)

`src/lib/studio.ts`. A stúdió feltételei szerint, ha a Studio Lumen mond le, a kredit
**mindig visszajár** — a 24 órás határtól függetlenül, mert az csak az
ügyfél lemondására vonatkozik. Pénzvisszafizetés nincs, csak jóváírás.

Egy lemondás egyetlen tranzakcióban: minden aktív foglalás `cancelled`
és `cancellationType = 'by_studio'`, a kredit visszaírva, az óra
`cancelled` a `cancellationReason` mezőben az okkal (a `note`, vagyis
Nadine saját megjegyzése, érintetlen marad), a várólista visszavonva.
Az értesítés **a tranzakció után** megy ki, hogy ne küldjünk levelet
olyan változásról, ami végül nem mentődött el. Újrafuttatható: a már
lemondott órán nem ír vissza kreditet másodszor.

A „túl kevés jelentkező" (minimum 2 fő) külön függvény, ami
megtagadja a lemondást, ha a létszám mégis összejött.

## Foglalás (kész)

- `/buchen` — órarend napokra bontva, stúdió szerint szűrhető
- `/buchen/[id]` — egy óra, **teremtérképpel**: a tükör fent, alatta a gépek
  a valós sor/oszlop elrendezésben. Szabad, foglalt és karbantartás alatti
  gép külön jelöléssel
- `/login` — belépés e-maillel és jelszóval
- `/konto` — abo-k, következő órák, lemondás, előzmények

A szabályok a `src/lib/booking.ts`-ben vannak:

| Szabály | Hol |
|---|---|
| Lemondás 24 órán túl → kredit vissza | `cancelBooking` |
| Lemondás 24 órán belül → kredit elvész, és „zu spät"-ként rögzül | `cancelBooking` |
| Foglalt gép nem foglalható újra | `createBooking` |
| Ugyanaz az ügyfél kétszer nem foglalhat | `createBooking` |
| Zárva tartási időszakban nincs foglalás | `isClosed` |
| Lejárt vagy kredit nélküli abo-val nem megy | `findUsableAbo` |

A lemondási határidő az adminból állítható (Buchungsregeln), nem a kódból.

## Demó-adat felvétele és frissítése

A sorrend számít, mert az egyik útvonal a másik eredményére épül. A
`DEMO_PASSWORD` legyen ugyanaz, mint ami a `/demo` lapon ki van írva.

```bash
BASE=http://localhost:3000
PW='StudioLumen2026'
J="content-type: application/json"

curl -X POST $BASE/setup/seed                               # stúdiók, gépek, abo- és óratípusok
curl -X POST $BASE/setup/teachers     -H "$J" -d "{\"password\":\"$PW\"}"
curl -X POST $BASE/setup/sessions                           # órarend — oktató KELL hozzá, ezért a teachers után
curl -X POST $BASE/setup/teachers     -H "$J" -d "{\"password\":\"$PW\"}"   # a már létező órák elosztása
curl -X POST $BASE/setup/demo-zugang  -H "$J" -d "{\"password\":\"$PW\"}"   # a két demó-belépés, admin joggal
curl -X POST $BASE/setup/demo-data    -H "$J" -d "{\"password\":\"$PW\"}"   # foglalások, telt órák, várólista
curl -X POST $BASE/setup/demo-profilok                      # egészségügyi megjegyzés, Young Member, matten
curl      $BASE/setup/demo-check                            # bemutatható-e az állapot
```

A `teachers` kétszer szerepel, és ez szándékos: az első hívás létrehozza az
oktatókat (különben a `sessions` nem tud kit beírni), a második pedig
szétosztja közöttük a már legenerált órákat, hogy a demóban német és angol
óra is legyen.

Mindegyik **újrafuttatható**. Az útvonalak csak `ALLOW_SEED=true` mellett
nyílnak — élesben ez a változó ne legyen beállítva.

Ha saját admin fiók is kell a Payload adminhoz, négy mező kötelező:

```bash
curl -X POST $BASE/setup/admin -H "$J" \
  -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
```

### Miért kell egyáltalán frissíteni

A bemutató-adat **időhöz kötött**: a telt óra és a várólista mindig a
legközelebbi órára kerül. Pár nap múlva ezek a múltba csúsznak, és a
bemutató két legerősebb pontja megmutathatatlan lesz.

### Az ellenőrzés hat pontja

| | Mit néz |
|---|---|
| 1 | nincs-e teszt-maradék (`@test.local` fiók, `TEST` óra, sorozat) |
| 2 | az emberek listája rendezett-e |
| 3 | van-e elég jövőbeli óra |
| 4 | van-e **telt óra várólistával** |
| 5 | van-e nyitott abo-megrendelés a Verwaltung oldalra |
| 6 | tud-e foglalni a demó-ügyfél |

A `/setup/demo-check` csak olvas, ezért az éles adatbázison is fut, és
nem kell hozzá `ALLOW_SEED`.

### Tesztelés

```bash
curl -X POST http://localhost:3000/setup/test
```

**Az éles adatbázison ez nem fut le.** A készlet teszt-ügyfeleket és
teszt-órákat hoz létre, és 2026 októberében egy ilyen futás 95 teszt-fiókot
és 80 teszt-órát hagyott az éles adatbázisban — a bemutatón „Kundin Nr140"
nevű ügyfelek és „Serien Nr169" nevű oktató látszott volna. Azóta a
`src/lib/guard.ts` megnézi, hogy a `DATABASE_URI` Postgresre mutat-e, és
ha igen, `409`-cel elutasítja. Megkerülni csak szándékosan lehet
(`FORCE_TEST_ON_PRODUCTION=true`), és nem érdemes.

**183 ellenőrzés** fut le, 34 témakörben. Minden eset saját adatot hoz létre,
a futás elején és végén minden teszt-adat törlődik, így újrafuttatható és a
sorrendtől sem függ. A teszt-készlet a `src/lib/test-suite.ts`-ben van.

Lefedett ágak:

| Témakör | Mit ellenőriz |
|---|---|
| Foglalás | géppel és gép nélkül (automatikus kiosztás), kredit levonása |
| Ütközés | ugyanaz az ügyfél kétszer; más ügyfél foglalt gépre |
| Kapacitás | a terem pontosan megtelik, utána elutasít |
| Abo | nulla kredit, lejárt, stornózott, egyáltalán nincs abo |
| Több abo | a hamarabb lejáró fogy először |
| Óra állapota | lemondott óra, múltbeli óra |
| Gép | másik stúdió gépe, karbantartás alatti gép, kapacitás csökkenése |
| Zárva tartás | más óratípus, más stúdió, saját óratípus, korlátozás nélküli |
| Lemondás | 24 órán túl és belül, kétszeri lemondás, idegen foglalás |
| Újrafoglalás | lemondás után a gép ismét szabad |
| Hibás adat | nem létező óra- és foglalásazonosító |
| Várólista-ablak | a négy lépcső, és hogy az ablak valóban rövidül |
| Várólista | csak tele óránál; sorrend; dupla feliratkozás; kilépés; idegen eintrag |
| Kiajánlás | az elsőnek megy; egyszerre csak egy; csak ő váltja be; lejárat után nem |
| Lejárat | a következő emberre száll át; a lock-ablakon belül mindenki foglalhat |
| Jelenlét | késői vs. időbeni lemondás elkülönítése; óra lezárása; javítás; statisztika |
| Sorozat | generálás, duplikálás-mentesség, helyes hétköznap és napszak |
| Nyári időszámítás | 09:00 márciusban váltás előtt és után is 09:00 marad |
| Sorozat-szerkesztés | „csak ez" leszakít; „ez és a jövőbeliek" átvisz; a korábbiak érintetlenek |
| Foglalás-követés | sorozat-módosítás után a foglalás aktív marad és követi az időpontot |
| Söprés | a lemondáson kívül felszabadult hely is kiajánlódik, de nem kétszer |
| Levelek | ajánlat, felszabadítás, időpont- és oktatóváltás, lemondás szövege |
| Nem-értesítés | hossz-változás és a lemondott foglalók nem kapnak levelet |
| Stúdió-lemondás | kredit mindig vissza, stornoart, ok a saját mezőbe, hinweis érintetlen |
| Minimum létszám | elég jelentkezőnél megtagadja, kevésnél lemond és értesít |

Minden elutasított esetnél azt is ellenőrzi, hogy **a kredit nem vonódott le**.

Teszt-adatok jelölése: `@test.local` e-mail és `note = 'TEST'` az órákon.
A takarítás csak ezeket törli, az éles adatokhoz nem nyúl.

## Ami még nincs kész

1. **E-mail kézbesítés** — egy adapter (Resend vagy SMTP) a
   `payload.config.ts`-be. A levelek szövege és a kiküldés logikája kész,
   csak a postára adás hiányzik.
2. **Abo-vásárlás és Stripe** (kártya + TWINT), Nadine adataival
3. **Belépés e-mail linkkel** (most csak jelszó)
4. **A meglévő weboldal tartalma** Payloadba, hogy Nadine szerkeszthesse
5. **Vercel Cron** a `/setup/waitlist-tick`-hez (most kézzel kell hívni), és
   egy napi job, ami a lement órákat automatikusan lezárja

## Ismert környezeti korlátok

- A `payload` CLI (`generate:types`, `generate:importmap`) **nem fut Node 24
  alatt** egy undici-ütközés miatt. Ha kell, Node 20 vagy 22 alatt futtasd.
  A fejlesztéshez nincs rá szükség, az admin enélkül is működik.
- A Payload SQLite-adaptere fejlesztéskor **interaktívan** kérdez rá a
  séma-változásokra (átnevezés vagy új oszlop), és a kérdés nem jelenik meg,
  ha a szerver nem terminálban fut. Ha egy mezőt átnevezel, a boot elakad.
  Kerülő út: a régi mezőt ne töröld, hanem hagyd `admin: { hidden: true }`
  jelöléssel (így tett a `waitlistOfferHours`), vagy add hozzá az oszlopot
  kézzel az `sqlite3 studio-lumen.db` eszközzel, és indítsd újra.
- Az npm itt blokkolja a csomagok telepítő szkriptjeit. A `sharp` és az
  `esbuild` előre fordított binárissal jön, ezért így is működnek.

## Abo-megrendelés fizetési szolgáltató nélkül (kész)

A modellezett fizetés **helyszíni készpénz vagy banki átutalás**
(QR-számla, 10 nap). A megrendelés ezért nem fizetés:

1. az ügyfél a `/abos` lapon rendel, és megadja a fizetés módját
2. az abo `pending` állapotba kerül — **ezzel nem lehet foglalni**, mert a
   `findUsableAbo` csak `active` abo-t vesz figyelembe
3. visszaigazoló levelet kap a fizetési útmutatóval (a szövege a
   Buchungsregeln beállításban van, bankadat nélkül — azt Nadine írja be)
4. a pénz beérkezése után Nadine a `/verwaltung` lapon egy gombbal
   felszabadítja, és az ügyfél értesítést kap

Az **érvényesség a felszabadítástól** számít, nem a megrendeléstől, hogy a
várakozás ne fogyassza az abo-t.

A kedvezményes tarifa (Young Member 16–24, matten-résztvevők) csak annak
jelenik meg, aki jogosult rá, és a megrendelés szerverоldalon is ellenőrzi —
így nem kell utólag visszautasítani. Az utalványos abo csak utalvánnyal
rendelhető.

Amikor a Stripe bekerül, csak egy harmadik út nyílik az aktiváláshoz
(`paymentMethod: 'online'`, azonnali `confirmPayment`); a modell marad.

## Deploy Vercelre

Amire szükség van: egy **GitHub** fiók (a kód odakerül), egy **Vercel**
fiók, és egy **Postgres** adatbázis — a [Neon](https://neon.tech) ingyenes
csomagja erre elég.

```bash
# 1. a kód GitHubra
git add -A && git commit -m "Weboldal és foglalórendszer"
git remote add origin git@github.com:<felhasznalo>/studio-lumen.git
git push -u origin main
```

2. A Neonban új projekt → másold ki a kapcsolati sztringet
   (`postgresql://…?sslmode=require`).

3. A Vercelen *Add New → Project* → válaszd ki a repót. Környezeti
   változók (Settings → Environment Variables):

| Változó | Érték |
|---|---|
| `DATABASE_URI` | a Neon kapcsolati sztringje |
| `PAYLOAD_SECRET` | `openssl rand -base64 32` |
| `SITE_URL` | a Vercel címe, pl. `https://studio-lumen-demo.vercel.app` |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `ALLOW_SEED` | `true` **csak az első feltöltéshez**, utána törölni |

4. Az első deploy után az alapadatok felvétele:

```bash
curl -X POST https://<cím>/setup/seed
curl -X POST https://<cím>/setup/admin -H 'content-type: application/json' \
  -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
curl -X POST https://<cím>/setup/sessions
```

5. **Töröld az `ALLOW_SEED` változót** és indíts újra egy deployt. Ezzel a
   `/setup/*` útvonalak bezárulnak.

### Ütemezés a várólistához

A Vercel **ingyenes csomagján a cron naponta csak egyszer futhat**, és egy
percenkénti ütemezés már a deploynál elbukik. Egy várólista-ajánlat viszont
percekben jár le, ezért a tényleges taktust a `maybeTick()` adja: aki
megnyitja az órarendet, az egyben le is pörgeti a kört, de legfeljebb
percenként egyszer. Az utolsó futás ideje a Buchungsregeln globalban van,
nem memóriában, mert a szerverless példányok nem osztoznak a memórián.

A `vercel.json`-ban emellett van egy **napi** cron (`/api/cron/waitlist`,
`CRON_SECRET`-tel védve) biztonsági hálónak arra az esetre, ha senki nem jár
az oldalon. Fizetős csomagon ez átállítható percenkéntire, és akkor a lusta
kör már csak tartalék.

A `vercel.json`-ba **nem lehet megjegyzést írni**: a JSON nem ismer
kommentet, és a Vercel elutasítja a séma által nem ismert mezőket
(`INVALID_VERCEL_CONFIG`), így a deploy már az első másodpercben elbukik.
A magyarázat ezért itt van, nem a fájlban.

### Ami a demóban szándékosan nincs

- **Nincs online fizetés.** Az abo-megrendelés helyszíni vagy átutalásos
  fizetést modellez.
- **A levelek nem mennek el.** Nincs e-mail szolgáltató beállítva, a
  Payload a konzolra ír, a `notifications` napló pedig „Nur protokolliert"
  állapottal rögzíti a szöveget. Az adminban minden levél visszaolvasható.
- **Az oldal tartalma még a kódban van**, nem Payloadban — Nadine az
  órarendet, az abo-kat és a személyeket tudja szerkeszteni, a marketing
  szövegeket még nem.
