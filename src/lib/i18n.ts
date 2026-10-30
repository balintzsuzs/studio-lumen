import type { Lang } from './lang'

/**
 * The booking system's wording, in German and English.
 *
 * One single dictionary rather than scattered per file: when a string
 * changes, its counterpart is right there, and no branch is left
 * untranslated. The keys are typed — `tsc` catches a mistyped one.
 *
 * The marketing site (`src/app/(site)` and `(site-en)`) does not come
 * from here: that is markup converted mechanically from the approved
 * HTML, on two separate routes, because search engines need to see it.
 *
 * Interpolation: parts written as `{name}` are filled in by the second
 * argument of `t()`, for example `t('konto.spaet', { ora: 24 })`.
 */
export const SZOTAR = {
  // ------------------------------------------------------------ general
  'kozos.anmelden': { de: 'Anmelden', en: 'Sign in' },
  'kozos.abmelden': { de: 'Abmelden', en: 'Sign out' },
  'kozos.abmelden_kicsi': { de: 'abmelden', en: 'sign out' },
  'kozos.stundenplan': { de: 'Stundenplan', en: 'Schedule' },
  'kozos.stundenplan_vissza': { de: '← Stundenplan', en: '← Schedule' },
  'kozos.mein_konto': { de: 'Mein Konto', en: 'My account' },
  'kozos.unterricht': { de: 'Unterricht', en: 'Teaching' },
  'kozos.unterricht_vissza': { de: '← Unterricht', en: '← Teaching' },
  'kozos.admin': { de: 'Admin', en: 'Admin' },
  'kozos.guthaben': { de: 'Guthaben', en: 'credits' },
  'kozos.lektion': { de: 'Lektion', en: 'class' },
  'kozos.lektionen': { de: 'Lektionen', en: 'classes' },
  'kozos.minuten': { de: 'Minuten', en: 'minutes' },
  'kozos.min_rovid': { de: 'Min.', en: 'min' },
  'kozos.stunden': { de: 'Stunden', en: 'hours' },
  'kozos.gueltig_bis': { de: 'gültig bis', en: 'valid until' },
  'kozos.nyelv_valto': { de: 'Sprache wählen', en: 'Choose language' },

  // ------------------------------------------------------------ sign-in
  'login.cim': { de: 'Anmelden', en: 'Sign in' },
  'login.email': { de: 'E-Mail', en: 'E-mail' },
  'login.jelszo': { de: 'Passwort', en: 'Password' },
  'login.megjegyzes': { de: 'Anmeldung per E-Mail-Link folgt.', en: 'Sign-in by e-mail link is coming.' },
  'login.vissza': { de: 'Zurück zum Stundenplan', en: 'Back to the schedule' },

  // ------------------------------------------------------------ schedule
  'buchen.eyebrow': { de: 'Stundenplan', en: 'Schedule' },
  'buchen.cim': { de: 'Reformer buchen', en: 'Book a reformer class' },
  'buchen.angemeldet_als': { de: 'Angemeldet als {nev}', en: 'Signed in as {nev}' },
  'buchen.alle_studios': { de: 'Alle Studios', en: 'All studios' },
  'buchen.nincs_ora': { de: 'Zurzeit sind keine Lektionen ausgeschrieben.', en: 'No classes are scheduled at the moment.' },
  'buchen.gomb': { de: 'Buchen', en: 'Book' },

  // ------------------------------------------------------------ class details
  'ora.uhr': { de: 'Uhr', en: '' },
  'ora.warteliste_pozicio': {
    de: 'Du stehst auf der Warteliste, Position {pozicio}. Wir schreiben dir, sobald ein Platz frei wird.',
    en: 'You are on the waiting list, position {pozicio}. We will write as soon as a spot opens up.',
  },
  'ora.abgemeldet': { de: 'Du bist von der Warteliste abgemeldet.', en: 'You have been removed from the waiting list.' },
  'ora.zarva': { de: 'In diesem Zeitraum finden keine Lektionen statt: {ok}.', en: 'No classes take place during this period: {ok}.' },
  'ora.lemondva': { de: 'Diese Lektion wurde abgesagt{ok}', en: 'This class has been cancelled{ok}' },
  'ora.mar_elkezdodott': { de: 'Diese Lektion hat bereits begonnen.', en: 'This class has already started.' },
  'ora.ajanlat_cim': { de: 'Ein Platz ist für dich frei', en: 'A spot is free for you' },
  'ora.ajanlat_szoveg_elott': { de: 'Du bist auf der Warteliste an der Reihe. Dein Angebot gilt bis', en: 'It is your turn on the waiting list. Your offer is valid until' },
  'ora.ajanlat_szoveg_utan': { de: '; danach geht es an die nächste Person weiter.', en: '; after that it passes to the next person.' },
  'ora.geraet_waehlen': { de: 'Gerät wählen', en: 'Choose a reformer' },
  'ora.szabad_kesz': { de: '{szabad} von {osszes} Geräten frei.', en: '{szabad} of {osszes} reformers free.' },
  'ora.varolistan_allnak': { de: ' {db} auf der Warteliste.', en: ' {db} on the waiting list.' },
  'ora.spiegel': { de: 'Spiegel', en: 'Mirror' },
  'ora.frei': { de: 'Frei', en: 'Free' },
  'ora.belegt': { de: 'Belegt', en: 'Taken' },
  'ora.nem_elerheto': { de: 'Nicht verfügbar', en: 'Not available' },
  'ora.wartung': { de: 'Wartung', en: 'Maintenance' },
  'ora.foglalashoz_belepes': { de: 'Zum Buchen bitte', en: 'To book, please' },
  'ora.belepes_szo': { de: 'anmelden', en: 'sign in' },
  'ora.nincs_abo': { de: 'Du hast kein gültiges Abo mit Guthaben.', en: 'You have no valid pass with credits.' },
  'ora.abo_bestellen': { de: 'Abo bestellen', en: 'Order a pass' },
  'ora.guthaben_sor': { de: 'Guthaben: {db} · gültig bis {datum}', en: 'Credits: {db} · valid until {datum}' },
  'ora.platz_uebernehmen': { de: 'Platz übernehmen', en: 'Take the spot' },
  'ora.verbindlich_buchen': { de: 'Verbindlich buchen', en: 'Confirm booking' },
  'ora.storno_szabaly': {
    de: 'Stornierung bis {ora} Stunden vor Beginn, danach verfällt das Guthaben.',
    en: 'Cancellation up to {ora} hours before the start; after that the credit is forfeited.',
  },
  'ora.warteliste': { de: 'Warteliste', en: 'Waiting list' },
  'ora.feliratkozashoz_belepes': { de: 'Zum Eintragen bitte', en: 'To join, please' },
  'ora.varolista_magyarazat_elott': {
    de: 'Diese Lektion ist ausgebucht. Trägst du dich ein, melden wir dich per E-Mail, sobald ein Platz frei wird — der Reihe nach. So nah am Termin hättest du dann',
    en: 'This class is fully booked. If you join, we will e-mail you as soon as a spot opens up — in order. This close to the date you would then have',
  },
  'ora.varolista_magyarazat_utan': { de: 'Zeit zu reagieren, danach geht das Angebot weiter.', en: 'to respond; after that the offer moves on.' },
  'ora.varolistara': { de: 'Auf die Warteliste', en: 'Join the waiting list' },
  'ora.sorra_kerultel': { de: 'Du bist an der Reihe — der Platz oben wartet auf dich.', en: 'It is your turn — the spot above is waiting for you.' },
  'ora.ajanlat_lejart': { de: 'Dein Angebot ist abgelaufen und ging an die nächste Person.', en: 'Your offer has expired and passed to the next person.' },
  'ora.pozicio_sor': { de: 'Du stehst auf Position {pozicio} von {osszes}.', en: 'You are at position {pozicio} of {osszes}.' },
  'ora.varolistarol_le': { de: 'Von der Warteliste abmelden', en: 'Leave the waiting list' },

  // ------------------------------------------------------------ account
  'konto.eyebrow': { de: 'Mein Konto', en: 'My account' },
  'konto.gebucht': { de: 'Buchung bestätigt.', en: 'Booking confirmed.' },
  'konto.storno_jovairva': { de: 'Storniert, das Guthaben wurde zurückgebucht.', en: 'Cancelled, the credit has been returned.' },
  'konto.storno_elveszett': { de: 'Storniert. Innerhalb von {ora} Stunden verfällt das Guthaben.', en: 'Cancelled. Within {ora} hours the credit is forfeited.' },
  'konto.abos': { de: 'Abos', en: 'Passes' },
  'konto.nincs_abo': { de: 'Kein aktives Abo.', en: 'No active pass.' },
  'konto.kovetkezo_orak': { de: 'Nächste Lektionen', en: 'Upcoming classes' },
  'konto.nincs_foglalas': { de: 'Keine gebuchten Lektionen.', en: 'No booked classes.' },
  'konto.stornieren': { de: 'Stornieren', en: 'Cancel' },
  'konto.stornieren_elveszik': { de: 'Stornieren, Guthaben verfällt', en: 'Cancel, credit will be forfeited' },
  'konto.verlauf': { de: 'Verlauf', en: 'History' },
  'konto.storno_gut': { de: 'storniert, gutgeschrieben', en: 'cancelled, credited back' },
  'konto.storno_verfallen': { de: 'storniert, verfallen', en: 'cancelled, forfeited' },

  // ------------------------------------------------------------ passes
  'abos.eyebrow': { de: 'Preise', en: 'Prices' },
  'abos.cim': { de: 'Abos', en: 'Passes' },
  'abos.lead': {
    de: 'Alle Preise in Schweizer Franken. Die Bezahlung erfolgt bar im Studio oder per Rechnung — online mit Karte oder TWINT folgt später.',
    en: 'All prices in Swiss francs. Payment is made in cash at the studio or by invoice — online with card or TWINT is coming later.',
  },
  'abos.megrendelve': {
    de: 'Bestellung erhalten. Wir schalten dein Guthaben frei, sobald die Zahlung bei uns eingetroffen ist.',
    en: 'Order received. We will release your credits as soon as the payment has reached us.',
  },
  'abos.visszavonva': { de: 'Bestellung zurückgezogen.', en: 'Order withdrawn.' },
  'abos.nyitott_cim': { de: 'Deine offene Bestellung', en: 'Your open order' },
  'abos.nyitott_ervenyesseg': {
    de: 'Die Gültigkeit beginnt erst mit der Freischaltung — die Wartezeit geht nicht von deinem Abo ab.',
    en: 'Validity starts only when the pass is released — the waiting time does not come off your pass.',
  },
  'abos.visszavon_gomb': { de: 'Bestellung zurückziehen', en: 'Withdraw order' },
  'abos.reformer': { de: 'Reformer', en: 'Reformer' },
  'abos.kedvezmenyes_cim': { de: 'Young Member & Matten-Teilnehmende', en: 'Young members & mat Pilates participants' },
  'abos.kedvezmenyes_leiras': {
    de: 'Reduzierter Tarif für 16- bis 24-Jährige und für Teilnehmerinnen unserer Matten-Pilates-Kurse.',
    en: 'Reduced rate for 16 to 24 year olds and for participants in our mat Pilates courses.',
  },
  'abos.kedvezmeny_ajanlat': {
    de: 'Du bist zwischen 16 und 24 oder besuchst unsere Matten-Kurse? Dann steht dir ein reduzierter Tarif zu — melde dich bei uns, wir hinterlegen das in deinem Konto.',
    en: 'Are you between 16 and 24, or do you attend our mat courses? Then a reduced rate applies to you — get in touch and we will note it on your account.',
  },
  'abos.belepes_rendeleshez_elott': { de: 'Zum Bestellen bitte', en: 'To order, please' },
  'abos.belepes_rendeleshez_utan': { de: '.', en: '.' },
  'abos.aprobetus': {
    de: 'Abos sind persönlich und nicht übertragbar. Nicht oder teilweise genutzte Abos werden nicht zurückerstattet. Bei Krankheit, Unfall oder Schwangerschaft kann ein Abo gegen Arztzeugnis pausiert werden.',
    en: 'Passes are personal and non-transferable. Unused or partly used passes are not refunded. In case of illness, accident or pregnancy a pass can be paused against a medical certificate.',
  },
  'abos.ervenyes': { de: 'gültig', en: 'valid for' },
  'abos.bestellen': { de: 'Bestellen', en: 'Order' },
  'abos.nur_gutschein': { de: ' · nur mit Gutschein', en: ' · voucher only' },
  'abos.napok': { de: '{db} Tage', en: '{db} days' },
  'abos.egy_honap': { de: '1 Monat', en: '1 month' },
  'abos.honapok': { de: '{db} Monate', en: '{db} months' },
  'abos.fizetes_on_site': { de: 'Bar im Studio', en: 'Cash at the studio' },
  'abos.fizetes_transfer': { de: 'Banküberweisung', en: 'Bank transfer' },
  'abos.fizetes_voucher': { de: 'Gutschein', en: 'Voucher' },
  'abos.fizetes_online': { de: 'Karte / TWINT', en: 'Card / TWINT' },

  // ------------------------------------------------------------------ calendar
  'naptar.nezet': { de: 'Ansicht', en: 'View' },
  'naptar.nap': { de: 'Tag', en: 'Day' },
  'naptar.het': { de: 'Woche', en: 'Week' },
  'naptar.honap': { de: 'Monat', en: 'Month' },
  'naptar.ma': { de: 'Heute', en: 'Today' },
  'naptar.elozo': { de: 'Zurück', en: 'Previous' },
  'naptar.kovetkezo': { de: 'Weiter', en: 'Next' },
  'naptar.nincs_ora': { de: 'In diesem Zeitraum keine Lektionen.', en: 'No classes in this period.' },
  'naptar.lista': { de: 'Liste', en: 'List' },
  'naptar.frei': { de: '{db} frei', en: '{db} free' },
  'naptar.ausgebucht': { de: 'ausgebucht', en: 'fully booked' },
  'naptar.reszletek': { de: 'Details anzeigen', en: 'Show details' },
  'naptar.buchen': { de: 'Buchen', en: 'Book' },
  'naptar.ansehen': { de: 'Ansehen', en: 'Open' },
  'naptar.zeitzone': {
    de: 'Alle Zeiten in Schweizer Zeit.',
    en: 'All times in Swiss local time.',
  },
  'naptar.woche_waehlen': { de: 'Woche wählen', en: 'Choose week' },

  // ------------------------------------------------------------ instructor view
  'okt.cim': { de: 'Unterricht', en: 'Teaching' },
  'okt.lead_admin': { de: 'Alle Lektionen. Anwesenheit erfassen und Lektionen absagen.', en: 'All classes. Record attendance and cancel classes.' },
  'okt.kovetkezo': { de: 'Kommende Lektionen', en: 'Upcoming classes' },
  'okt.nincs_kovetkezo': { de: 'Keine kommenden Lektionen.', en: 'No upcoming classes.' },
  'okt.elmult': { de: 'Vergangene Lektionen', en: 'Past classes' },
  'okt.nincs_elmult': { de: 'Noch keine vergangenen Lektionen.', en: 'No past classes yet.' },
  'okt.elmult_hint': {
    de: 'Nach der Lektion nur die Abwesenden markieren — wer angemeldet ist, gilt als anwesend. Nicht angerührte Lektionen schliessen sich nach {ora} Stunden von selbst.',
    en: 'After class, mark only who was absent — anyone booked counts as present. Classes you do not touch close themselves after {ora} hours.',
  },
  'okt.anmeldung': { de: 'Anmeldung', en: 'registration' },
  'okt.anmeldungen': { de: 'Anmeldungen', en: 'registrations' },
  'okt.offen': { de: 'offen', en: 'open' },
  'okt.abgesagt': { de: 'abgesagt', en: 'cancelled' },

  // ------------------------------------------------------------ class, instructor
  'oktora.resztvevok': { de: 'Teilnehmerinnen ({db} von {osszes})', en: 'Participants ({db} of {osszes})' },
  'oktora.nincs_jelentkezo': { de: 'Noch keine Anmeldungen.', en: 'No registrations yet.' },
  'oktora.felveve': { de: 'Anwesenheit erfasst.', en: 'Attendance recorded.' },
  'oktora.lezarva': {
    de: 'Lektion geschlossen. {db} {szo} als «besucht» erfasst.',
    en: 'Class closed. {db} {szo} recorded as “attended”.',
  },
  'oktora.buchung': { de: 'Buchung', en: 'booking' },
  'oktora.buchungen': { de: 'Buchungen', en: 'bookings' },
  'oktora.lemondva_info': {
    de: 'Lektion abgesagt. {db} {szo} informiert, Guthaben zurückgebucht.',
    en: 'Class cancelled. {db} {szo} notified, credits returned.',
  },
  'oktora.person': { de: 'Person', en: 'person' },
  'oktora.personen': { de: 'Personen', en: 'people' },
  'oktora.mar_lemondva': { de: 'Diese Lektion ist abgesagt{ok}', en: 'This class is cancelled{ok}' },
  'oktora.fejlec_nev': { de: 'Name', en: 'Name' },
  'oktora.fejlec_geraet': { de: 'Gerät', en: 'Reformer' },
  'oktora.fejlec_teilnahme': { de: 'Teilnahme', en: 'Attending with' },
  'oktora.fejlec_status': { de: 'Status', en: 'Status' },
  'oktora.abo_maradek': { de: '{nev} · noch {db}', en: '{nev} · {db} left' },
  'oktora.abo_utolso': {
    de: '{nev} · letzte Lektion',
    en: '{nev} · last class',
  },
  'oktora.jelzes_matten': { de: 'Matten-Kundin', en: 'mat-class customer' },
  'oktora.jelzes_young': { de: 'Young Member', en: 'Young Member' },
  'oktora.gesundheit': { de: 'Gesundheit', en: 'Health' },
  'oktora.fejlec_anwesenheit': { de: 'Anwesenheit', en: 'Attendance' },
  'oktora.status_booked': { de: 'gebucht', en: 'booked' },
  'oktora.status_attended': { de: 'besucht', en: 'attended' },
  'oktora.status_no_show': { de: 'nicht erschienen', en: 'no show' },
  'oktora.status_cancelled': { de: 'storniert', en: 'cancelled' },
  'oktora.storno_keso': { de: ' (zu spät)', en: ' (too late)' },
  'oktora.storno_studio': { de: ' (Studio)', en: ' (studio)' },
  'oktora.nem_jelent_meg_x': { de: '{db}× nicht erschienen', en: '{db}× no show' },
  'oktora.keson_mondta_le_x': { de: '{db}× zu spät storniert', en: '{db}× cancelled too late' },
  'oktora.da': { de: 'da', en: 'here' },
  'oktora.fehlt': { de: 'war nicht da', en: 'was absent' },
  'oktora.megis_ott_volt': { de: 'doch da', en: 'was here after all' },
  'oktora.gilt_anwesend': { de: 'gilt als anwesend', en: 'counts as present' },
  'oktora.lezaras_gomb': {
    de: 'Übrige {db} als anwesend erfassen',
    en: 'Record the remaining {db} as present',
  },
  'oktora.jelenlet_hint': {
    de: 'Nur die Abwesenden markieren. Wer angemeldet ist, gilt als anwesend — automatisch nach {ora} Stunden, oder sofort mit dem Knopf unten.',
    en: 'Mark only who was absent. Anyone booked counts as present — automatically after {ora} hours, or right away with the button below.',
  },
  'oktora.auto_lezart': {
    de: 'Automatisch geschlossen: alle Angemeldeten gelten als anwesend.',
    en: 'Closed automatically: everyone booked counts as present.',
  },
  'oktora.varolista_cim': { de: 'Warteliste ({db})', en: 'Waiting list ({db})' },
  'oktora.hely_ajanlva': { de: 'Platz angeboten bis {datum}', en: 'Spot offered until {datum}' },
  'oktora.lemondas_cim': { de: 'Lektion absagen', en: 'Cancel class' },
  'oktora.lemondas_hint': {
    de: 'Laut AGB wird das Guthaben bei einer Absage durch das Studio immer zurückgebucht — auch innerhalb der 24 Stunden. Alle Angemeldeten erhalten eine E-Mail.',
    en: 'Under the terms, a cancellation by the studio always returns the credit — even within the 24 hours. Everyone registered receives an e-mail.',
  },
  'oktora.ok_placeholder': { de: 'Grund, z. B. Krankheit der Trainerin', en: 'Reason, e.g. the instructor is ill' },
  'oktora.lemond_gomb': { de: 'Absagen und alle informieren', en: 'Cancel and notify everyone' },
  'oktora.keves_gomb': {
    de: 'Wegen zu wenigen Anmeldungen absagen (Minimum 2)',
    en: 'Cancel for too few registrations (minimum 2)',
  },

  // ------------------------------------------------------------ administration
  'verw.eyebrow': { de: 'Verwaltung', en: 'Administration' },
  'verw.cim': { de: 'Offene Bestellungen', en: 'Open orders' },
  'verw.felszabaditva': {
    de: 'Abo freigeschaltet. Die Kundin wurde informiert und kann jetzt buchen.',
    en: 'Pass released. The customer has been notified and can now book.',
  },
  'verw.sztornozva': { de: 'Bestellung storniert.', en: 'Order cancelled.' },
  'verw.lead': {
    de: 'Bezahlung bar im Studio oder per Überweisung. Sobald das Geld da ist, hier freischalten — die Gültigkeit beginnt dann, nicht bei der Bestellung.',
    en: 'Payment in cash at the studio or by transfer. As soon as the money is there, release it here — validity starts then, not at the time of ordering.',
  },
  'verw.nincs_nyitott': { de: 'Keine offenen Bestellungen.', en: 'No open orders.' },
  'verw.fej_kundin': { de: 'Kundin', en: 'Customer' },
  'verw.fej_abo': { de: 'Abo', en: 'Pass' },
  'verw.fej_betrag': { de: 'Betrag', en: 'Amount' },
  'verw.fej_zahlungsart': { de: 'Zahlungsart', en: 'Payment method' },
  'verw.fej_bestellt': { de: 'Bestellt', en: 'Ordered' },
  'verw.bezahlt_gomb': { de: 'bezahlt', en: 'paid' },
  'verw.stornieren_gomb': { de: 'stornieren', en: 'cancel' },
  'verw.utoljara_cim': { de: 'Zuletzt freigeschaltet', en: 'Recently released' },
  'verw.nincs_aktiv': { de: 'Noch keine aktiven Abos.', en: 'No active passes yet.' },
  'verw.bezahlt_cimke': { de: 'bezahlt {datum}', en: 'paid {datum}' },

  // ------------------------------------------------------------ emails
  // Notification emails go in the RECIPIENT's language
  // (`users.language`), not that of whoever triggered the action.
  'level.megszolitas': { de: 'Liebe {nev}', en: 'Dear {nev}' },
  'level.megszolitas_altalanos': { de: 'Kundin', en: 'customer' },
  'level.alairas': {
    de: '\n\nHerzliche Grüsse\nStudio Lumen\n\nZürich · Zug\nwww.studio-lumen.ch',
    en: '\n\nWarm regards\nStudio Lumen\n\nZürich · Zug\nwww.studio-lumen.ch',
  },
  'level.ora_szo': { de: 'Lektion', en: 'Class' },
  'level.helyszin_kozott': { de: ' in {varos}', en: ' in {varos}' },

  'level.ajanlat_targy': { de: 'Ein Platz ist frei geworden', en: 'A spot has opened up' },
  'level.ajanlat_torzs': {
    de: 'auf der Warteliste ist ein Platz frei geworden:\n\n  {mi}\n\nDu kannst ihn bis {hatarido} buchen.\nDanach geht das Angebot an die nächste Person auf der Warteliste.\n\nPlatz buchen: {link}',
    en: 'a spot has opened up on the waiting list:\n\n  {mi}\n\nYou can book it until {hatarido}.\nAfter that the offer passes to the next person on the waiting list.\n\nBook the spot: {link}',
  },

  'level.felszabadult_targy': { de: 'Kurzfristig ein Platz frei', en: 'A spot free at short notice' },
  'level.felszabadult_torzs': {
    de: 'kurzfristig ist ein Platz frei geworden:\n\n  {mi}\n\nSo kurz vor Beginn vergeben wir den Platz nicht mehr der Reihe nach —\nwer zuerst bucht, erhält ihn.\n\nJetzt buchen: {link}',
    en: 'a spot has opened up at short notice:\n\n  {mi}\n\nThis close to the start we no longer give the spot out in order —\nwhoever books first gets it.\n\nBook now: {link}',
  },

  'level.modositas_targy': { de: 'Deine Lektion wurde geändert', en: 'Your class has been changed' },
  'level.modositas_torzs': {
    de: 'deine gebuchte Lektion hat sich geändert:\n\n{sorok}\n\nDeine Buchung bleibt bestehen — du musst nichts tun.\nPasst der neue Termin nicht, kannst du bis 24 Stunden vorher\nkostenlos stornieren; das Guthaben kommt zurück.\n\nDeine Buchungen: {link}',
    en: 'your booked class has changed:\n\n{sorok}\n\nYour booking stands — you do not need to do anything.\nIf the new time does not suit you, you can cancel free of charge\nup to 24 hours beforehand; the credit comes back.\n\nYour bookings: {link}',
  },
  'level.modositas_ido': { de: 'Zeit:       ', en: 'Time:       ' },
  'level.modositas_oktato': { de: 'Leitung:    ', en: 'Instructor: ' },
  'level.modositas_hely': { de: 'Ort:        ', en: 'Location:   ' },

  'level.lemondas_targy': { de: 'Deine Lektion wurde abgesagt', en: 'Your class has been cancelled' },
  'level.lemondas_torzs': {
    de: 'leider müssen wir diese Lektion absagen:\n\n  {mi}\n\nGrund: {indok}\n{guthaben}\n\nDu kannst jederzeit einen neuen Termin buchen:\n{link}\n\nEs tut uns leid für die Umstände.',
    en: 'unfortunately we have to cancel this class:\n\n  {mi}\n\nReason: {indok}\n{guthaben}\n\nYou can book a new date at any time:\n{link}\n\nWe are sorry for the inconvenience.',
  },
  'level.lemondas_visszairva': {
    de: 'Deine Lektion wurde deinem Guthaben zurückgebucht.',
    en: 'Your class has been returned to your credit balance.',
  },
  'level.lemondas_nem_valtozott': {
    de: 'Dein Guthaben wurde nicht verändert.',
    en: 'Your credit balance has not been changed.',
  },

  'level.rendeles_targy': { de: 'Deine Abo-Bestellung ist bei uns', en: 'We have received your pass order' },
  'level.rendeles_torzs': {
    de: 'vielen Dank für deine Bestellung:\n\n  {abo} · {db} Lektionen · CHF {ar}\n  Zahlungsart: {mod}\n\n{utmutato}\n\nDein Guthaben steht dir zur Verfügung, sobald wir die Zahlung\nbestätigt haben — danach kannst du direkt Lektionen buchen.\nDie Gültigkeit beginnt erst mit der Freischaltung, die Wartezeit\ngeht also nicht von deinem Abo ab.',
    en: 'thank you very much for your order:\n\n  {abo} · {db} classes · CHF {ar}\n  Payment method: {mod}\n\n{utmutato}\n\nYour credits will be available as soon as we have confirmed the\npayment — after that you can book classes directly.\nValidity starts only when the pass is released, so the waiting\ntime does not come off your pass.',
  },
  'level.mod_on_site': { de: 'bar im Studio', en: 'cash at the studio' },
  'level.mod_transfer': { de: 'per Banküberweisung', en: 'by bank transfer' },
  'level.mod_voucher': { de: 'mit Gutschein', en: 'with a voucher' },
  'level.mod_online': { de: 'online mit Karte oder TWINT', en: 'online by card or TWINT' },

  'level.aktivalas_targy': { de: 'Dein Abo ist freigeschaltet', en: 'Your pass is active' },
  'level.aktivalas_torzs': {
    de: 'wir haben deine Zahlung erhalten — dein Abo ist freigeschaltet:\n\n  {abo} · {db} Lektionen\n  Gültig bis {ervenyes}\n\nJetzt Lektion buchen: {link}\n\nWir freuen uns auf dich.',
    en: 'we have received your payment — your pass is active:\n\n  {abo} · {db} classes\n  Valid until {ervenyes}\n\nBook a class now: {link}\n\nWe look forward to seeing you.',
  },

  // ------------------------------------------------------------ error messages
  // The `src/lib` layer returns these as keys, and the pages translate them.
  'hiba.abo_nincs': { de: 'Abo nicht gefunden.', en: 'Pass not found.' },
  'hiba.buchung_nincs': { de: 'Buchung nicht gefunden.', en: 'Booking not found.' },
  'hiba.nem_a_te_bejegyzesed': { de: 'Das ist nicht dein Eintrag.', en: 'That is not your entry.' },
  'hiba.nem_a_te_rendelesed': { de: 'Das ist nicht deine Bestellung.', en: 'That is not your order.' },
  'hiba.nem_a_te_foglalasod': { de: 'Das ist nicht deine Buchung.', en: 'That is not your booking.' },
  'hiba.csak_kedvezmenyes': {
    de: 'Der reduzierte Tarif gilt nur für Young Members (16–24) und Matten-Teilnehmende.',
    en: 'The reduced rate applies only to young members (16–24) and mat Pilates participants.',
  },
  'hiba.lemondas_mentes': { de: 'Die Absage konnte nicht gespeichert werden.', en: 'The cancellation could not be saved.' },
  'hiba.foglalas_mentes': { de: 'Die Buchung konnte nicht gespeichert werden.', en: 'The booking could not be saved.' },
  'hiba.ajanlat_lejart': { de: 'Die Frist für dein Angebot ist abgelaufen.', en: 'The deadline for your offer has passed.' },
  'hiba.storno_sikertelen': { de: 'Die Stornierung ist fehlgeschlagen.', en: 'The cancellation failed.' },
  'hiba.rendeles_nem_nyitott': { de: 'Diese Bestellung ist nicht offen.', en: 'This order is not open.' },
  'hiba.foglalas_nem_aktiv': { de: 'Diese Buchung ist nicht mehr aktiv.', en: 'This booking is no longer active.' },
  'hiba.ora_nincs': { de: 'Diese Lektion gibt es nicht.', en: 'This class does not exist.' },
  'hiba.ora_elkezdodott': { de: 'Diese Lektion hat bereits begonnen.', en: 'This class has already started.' },
  'hiba.ora_meg_nem_kezdodott': { de: 'Diese Lektion hat noch nicht begonnen.', en: 'This class has not started yet.' },
  'hiba.ora_tele': { de: 'Diese Lektion ist ausgebucht.', en: 'This class is fully booked.' },
  'hiba.ora_lemondva': { de: 'Diese Lektion wurde abgesagt.', en: 'This class has been cancelled.' },
  'hiba.abotipus_nincs': { de: 'Dieses Abo gibt es nicht.', en: 'This pass does not exist.' },
  'hiba.abo_nem_kaphato': { de: 'Dieses Abo ist derzeit nicht erhältlich.', en: 'This pass is currently not available.' },
  'hiba.abo_csak_utalvany': { de: 'Dieses Abo ist nur mit einem Gutschein erhältlich.', en: 'This pass is available only with a voucher.' },
  'hiba.gep_foglalt': { de: 'Dieses Gerät ist nicht mehr frei.', en: 'This reformer is no longer free.' },
  'hiba.mar_van_nyitott_rendeles': {
    de: 'Du hast bereits eine offene Bestellung. Wir melden uns, sobald sie bestätigt ist.',
    en: 'You already have an open order. We will be in touch as soon as it is confirmed.',
  },
  'hiba.mar_foglaltad': { de: 'Du hast diese Lektion bereits gebucht.', en: 'You have already booked this class.' },
  'hiba.mar_varolistan': { de: 'Du stehst bereits auf der Warteliste.', en: 'You are already on the waiting list.' },
  'hiba.sztornozott_nem_jelenlet': {
    de: 'Eine stornierte Buchung kann nicht als anwesend erfasst werden.',
    en: 'A cancelled booking cannot be recorded as attended.',
  },
  'hiba.bejegyzes_nincs': { de: 'Eintrag nicht gefunden.', en: 'Entry not found.' },
  'hiba.mar_fut_ajanlat': { de: 'Es läuft bereits ein Angebot.', en: 'An offer is already running.' },
  'hiba.van_szabad_hely': {
    de: 'Es sind noch Plätze frei — du kannst direkt buchen.',
    en: 'There are still spots free — you can book directly.',
  },
  'hiba.nincs_ajanlatod': { de: 'Für dich läuft kein Angebot.', en: 'There is no offer running for you.' },
  'hiba.nincs_szabad_hely': { de: 'Kein Platz frei.', en: 'No spot free.' },
  'hiba.nincs_ervenyes_abo': { de: 'Kein gültiges Abo mit Guthaben vorhanden.', en: 'No valid pass with credits available.' },
  'hiba.ora_nem_talalhato': { de: 'Lektion nicht gefunden.', en: 'Class not found.' },
  'hiba.ora_nem_foglalhato': { de: 'Lektion nicht mehr buchbar.', en: 'Class can no longer be booked.' },
  'hiba.senki_a_varolistan': { de: 'Niemand auf der Warteliste.', en: 'Nobody on the waiting list.' },
  'hiba.csak_nyitott_vonhato_vissza': {
    de: 'Nur offene Bestellungen können zurückgezogen werden.',
    en: 'Only open orders can be withdrawn.',
  },
  'hiba.zarva': {
    de: 'In diesem Zeitraum finden keine Lektionen statt.',
    en: 'No classes take place during this period.',
  },
  'hiba.eleg_jelentkezo': {
    de: 'Es sind genügend Anmeldungen — das Minimum ist erreicht.',
    en: 'There are enough registrations — the minimum has been reached.',
  },
  'hiba.altalanos': { de: 'Fehler', en: 'Error' },
  'hiba.rossz_jelszo': { de: 'E-Mail oder Passwort stimmt nicht.', en: 'E-mail or password is not correct.' },
  'hiba.belepes_sikertelen': { de: 'Anmeldung fehlgeschlagen.', en: 'Sign-in failed.' },
  'hiba.ora_ervenytelen_idopont': { de: 'Datum oder Uhrzeit stimmt nicht.', en: 'The date or time is not valid.' },
  'hiba.ora_ervenytelen_hossz': { de: 'Die Dauer muss zwischen 1 und 300 Minuten liegen.', en: 'The duration must be between 1 and 300 minutes.' },
  'hiba.ora_a_multban': { de: 'Eine Lektion in der Vergangenheit lässt sich nicht anlegen.', en: 'A class in the past cannot be created.' },
  'hiba.ora_hianyzo_adat': { de: 'Kursart oder Studio fehlt.', en: 'The class type or studio is missing.' },
  'hiba.ora_nem_oktato': { de: 'Diese Person ist keine Trainerin.', en: 'That person is not an instructor.' },
  'hiba.ora_utkozik': { de: 'Diese Trainerin hat zu dieser Zeit schon eine Lektion.', en: 'That instructor already has a class at this time.' },
  'hiba.ora_van_jelentkezo': {
    de: 'Es sind Personen angemeldet — bitte die Lektion absagen statt löschen.',
    en: 'People are booked — cancel the class instead of deleting it.',
  },
  'hiba.indok_kell': { de: 'Bitte einen Grund angeben.', en: 'Please give a reason.' },
  // ------------------------------------------------------------ customers (studio)
  'kunde.eyebrow': { de: 'Studio', en: 'Studio' },
  'kunde.lista_cim': { de: 'Kundinnen & Kunden', en: 'Customers' },
  'kunde.lista_lead': {
    de: 'Alle angemeldeten Personen. Tippe auf einen Namen für Kontakt, Hinweise und die besuchten Lektionen.',
    en: 'Everyone with an account. Tap a name for contact details, notes and the classes they attended.',
  },
  'kunde.kereses': { de: 'Name oder E-Mail', en: 'Name or e-mail' },
  'kunde.keres_gomb': { de: 'Suchen', en: 'Search' },
  'kunde.keres_torles': { de: 'Suche zurücksetzen', en: 'Clear search' },
  'kunde.nincs_talalat': { de: 'Niemand gefunden.', en: 'Nobody found.' },
  'kunde.senki': { de: 'Noch keine Kundinnen.', en: 'No customers yet.' },
  'kunde.db': { de: '{db} Personen', en: '{db} people' },
  'kunde.db_egy': { de: '1 Person', en: '1 person' },
  'kunde.fej_nev': { de: 'Name', en: 'Name' },
  'kunde.fej_kontakt': { de: 'Kontakt', en: 'Contact' },
  'kunde.fej_hinweise': { de: 'Hinweise', en: 'Notes' },
  'kunde.van_egeszseg': { de: 'gesundheitlicher Hinweis', en: 'health note' },
  'kunde.lista_vissza': { de: '← Kundinnen & Kunden', en: '← Customers' },
  'kunde.nincs_ilyen': { de: 'Diese Person gibt es nicht.', en: 'No such person.' },
  'kunde.oktato_cimke': { de: 'Trainerin', en: 'Instructor' },
  'kunde.admin_cimke': { de: 'Administration', en: 'Administration' },
  'kunde.kontakt_cim': { de: 'Kontakt', en: 'Contact' },
  'kunde.telefon': { de: 'Telefon', en: 'Phone' },
  'kunde.nincs_telefon': { de: 'keine Nummer hinterlegt', en: 'no number on file' },
  'kunde.jahrgang': { de: 'Jahrgang', en: 'Year of birth' },
  'kunde.sprache': { de: 'Sprache', en: 'Language' },
  'kunde.hinweise_cim': { de: 'Gesundheitliche Hinweise', en: 'Health notes' },
  'kunde.nincs_hinweis': {
    de: 'Keine Hinweise hinterlegt. Ergänzen kannst du sie im Admin-Bereich.',
    en: 'Nothing on file. You can add notes in the admin area.',
  },
  'kunde.szerkeszt': { de: 'Im Admin bearbeiten', en: 'Edit in admin' },
  'kunde.abok_cim': { de: 'Abos', en: 'Passes' },
  'kunde.nincs_abo': { de: 'Noch kein Abo.', en: 'No pass yet.' },
  'kunde.abo_guthaben': { de: '{db} Guthaben', en: '{db} credits' },
  'kunde.abo_guthaben_egy': { de: '1 Guthaben', en: '1 credit' },
  'kunde.kredit_osszesen': { de: 'Guthaben insgesamt: {db}', en: 'Credits in total: {db}' },
  'kunde.abo_status_pending': { de: 'Zahlung offen', en: 'payment pending' },
  'kunde.abo_status_active': { de: 'aktiv', en: 'active' },
  'kunde.abo_status_expired': { de: 'abgelaufen', en: 'expired' },
  'kunde.abo_status_cancelled': { de: 'storniert', en: 'cancelled' },
  'kunde.jovo_cim': { de: 'Angemeldet für', en: 'Booked for' },
  'kunde.nincs_jovo': { de: 'Aktuell für keine Lektion angemeldet.', en: 'Not booked for any class right now.' },
  'kunde.korabbi_cim': { de: 'Vergangene Lektionen', en: 'Past classes' },
  'kunde.nincs_korabbi': { de: 'Noch keine Lektion besucht.', en: 'No classes yet.' },
  'kunde.nyitott_jelenlet': {
    de: '{db}× noch nicht erfasst — die Anwesenheit trägt man auf der Lektionsseite nach.',
    en: '{db}× not recorded yet — attendance is filled in on the class page.',
  },
  'kunde.statisztika': {
    de: '{besucht}× besucht · {nem}× nicht erschienen · {keso}× zu spät storniert · {idoben}× rechtzeitig storniert',
    en: '{besucht}× attended · {nem}× no show · {keso}× cancelled too late · {idoben}× cancelled in time',
  },
  'kunde.tovabbi': { de: 'Weitere {db} anzeigen', en: 'Show {db} more' },
  'kunde.kundinnen': { de: 'Kundinnen', en: 'Customers' },
  // ------------------------------------------------------------ creating / deleting a class
  'ujora.cim': { de: 'Lektion hinzufügen', en: 'Add a class' },
  'ujora.nyit': { de: '+ Lektion hinzufügen', en: '+ Add a class' },
  'ujora.zar': { de: 'Abbrechen', en: 'Cancel' },
  'ujora.hint': {
    de: 'Für einzelne Termine: Workshop, Ersatzlektion, Nachholtermin. Regelmässige Lektionen laufen über die Serien im Admin-Bereich.',
    en: 'For one-off dates: a workshop, a replacement class, a make-up session. Recurring classes run through the series in the admin area.',
  },
  'ujora.datum': { de: 'Datum', en: 'Date' },
  'ujora.ido': { de: 'Beginn', en: 'Starts at' },
  'ujora.tipus': { de: 'Kursart', en: 'Class type' },
  'ujora.studio': { de: 'Studio', en: 'Studio' },
  'ujora.oktato': { de: 'Trainerin', en: 'Instructor' },
  'ujora.hossz': { de: 'Dauer in Minuten', en: 'Duration in minutes' },
  'ujora.nyelv': { de: 'Sprache', en: 'Language' },
  'ujora.nyelv_auto': { de: 'Sprachen der Trainerin', en: 'The instructor’s languages' },
  'ujora.megjegyzes': { de: 'Hinweis (optional)', en: 'Note (optional)' },
  'ujora.gomb': { de: 'Lektion anlegen', en: 'Create class' },
  'ujora.letrejott': { de: 'Lektion angelegt. Sie steht ab sofort im Stundenplan.', en: 'Class created. It is now on the schedule.' },
  'ujora.torol_cim': { de: 'Lektion löschen', en: 'Delete class' },
  'ujora.torol_hint': {
    de: 'Nur solange niemand angemeldet ist. Gibt es Anmeldungen, sag die Lektion ab — dann bekommen alle ihr Guthaben zurück und eine Nachricht.',
    en: 'Only while nobody is booked. If there are registrations, cancel the class instead — everyone gets their credit back and a message.',
  },
  'ujora.torol_gomb': { de: 'Endgültig löschen', en: 'Delete permanently' },
  'ujora.torolve': { de: 'Lektion gelöscht.', en: 'Class deleted.' },
} as const

export type SzotarKulcs = keyof typeof SZOTAR

/** The key of an error message — what the `src/lib` functions return. */
export type HibaKulcs = Extract<SzotarKulcs, `hiba.${string}`>

const behelyettesit = (szoveg: string, ertekek?: Record<string, string | number>) =>
  ertekek
    ? szoveg.replace(/\{(\w+)\}/g, (egesz, nev) =>
        nev in ertekek ? String(ertekek[nev]) : egesz,
      )
    : szoveg

/**
 * A translator bound to the given language.
 *
 *     const t = forditó('en')
 *     t('konto.storno_elveszett', { ora: 24 })
 */
export const forditó = (lang: Lang) =>
  (kulcs: SzotarKulcs, ertekek?: Record<string, string | number>): string =>
    behelyettesit(SZOTAR[kulcs][lang], ertekek)

export type Fordito = ReturnType<typeof forditó>

/** True if the string is a dictionary key — for validating the `?fehler=` parameter. */
export const szotarKulcs = (v: unknown): v is SzotarKulcs =>
  typeof v === 'string' && v in SZOTAR
