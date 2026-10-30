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
 * argument of `t()`, for example `t('account.cancel_forfeited', { hours: 24 })`.
 */
export const DICTIONARY = {
  // ------------------------------------------------------------ general
  'common.sign_in': { de: 'Anmelden', en: 'Sign in' },
  'common.sign_out': { de: 'Abmelden', en: 'Sign out' },
  'common.sign_out_lower': { de: 'abmelden', en: 'sign out' },
  'common.schedule': { de: 'Stundenplan', en: 'Schedule' },
  'common.schedule_back': { de: '← Stundenplan', en: '← Schedule' },
  'common.my_account': { de: 'Mein Konto', en: 'My account' },
  'common.teaching': { de: 'Unterricht', en: 'Teaching' },
  'common.teaching_back': { de: '← Unterricht', en: '← Teaching' },
  'common.admin': { de: 'Admin', en: 'Admin' },
  'common.credits': { de: 'Guthaben', en: 'credits' },
  'common.class': { de: 'Lektion', en: 'class' },
  'common.classes': { de: 'Lektionen', en: 'classes' },
  'common.minutes': { de: 'Minuten', en: 'minutes' },
  'common.min_short': { de: 'Min.', en: 'min' },
  'common.hours': { de: 'Stunden', en: 'hours' },
  'common.valid_until': { de: 'gültig bis', en: 'valid until' },
  'common.choose_language': { de: 'Sprache wählen', en: 'Choose language' },

  // ------------------------------------------------------------ sign-in
  'login.title': { de: 'Anmelden', en: 'Sign in' },
  'login.email': { de: 'E-Mail', en: 'E-mail' },
  'login.password': { de: 'Passwort', en: 'Password' },
  'login.note': { de: 'Anmeldung per E-Mail-Link folgt.', en: 'Sign-in by e-mail link is coming.' },
  'login.back': { de: 'Zurück zum Stundenplan', en: 'Back to the schedule' },

  // ------------------------------------------------------------ schedule
  'schedule.eyebrow': { de: 'Stundenplan', en: 'Schedule' },
  'schedule.title': { de: 'Reformer buchen', en: 'Book a reformer class' },
  'schedule.signed_in_as': { de: 'Angemeldet als {name}', en: 'Signed in as {name}' },
  'schedule.all_studios': { de: 'Alle Studios', en: 'All studios' },
  'schedule.no_classes': { de: 'Zurzeit sind keine Lektionen ausgeschrieben.', en: 'No classes are scheduled at the moment.' },
  'schedule.book': { de: 'Buchen', en: 'Book' },

  // ------------------------------------------------------------ class details
  'class.oclock': { de: 'Uhr', en: '' },
  'class.waitlist_position': {
    de: 'Du stehst auf der Warteliste, Position {position}. Wir schreiben dir, sobald ein Platz frei wird.',
    en: 'You are on the waiting list, position {position}. We will write as soon as a spot opens up.',
  },
  'class.left_waitlist': { de: 'Du bist von der Warteliste abgemeldet.', en: 'You have been removed from the waiting list.' },
  'class.closed': { de: 'In diesem Zeitraum finden keine Lektionen statt: {reason}.', en: 'No classes take place during this period: {reason}.' },
  'class.cancelled': { de: 'Diese Lektion wurde abgesagt{reason}', en: 'This class has been cancelled{reason}' },
  'class.already_started': { de: 'Diese Lektion hat bereits begonnen.', en: 'This class has already started.' },
  'class.offer_title': { de: 'Ein Platz ist für dich frei', en: 'A spot is free for you' },
  'class.offer_text_before': { de: 'Du bist auf der Warteliste an der Reihe. Dein Angebot gilt bis', en: 'It is your turn on the waiting list. Your offer is valid until' },
  'class.offer_text_after': { de: '; danach geht es an die nächste Person weiter.', en: '; after that it passes to the next person.' },
  'class.choose_reformer': { de: 'Gerät wählen', en: 'Choose a reformer' },
  'class.free_of_total': { de: '{free} von {total} Geräten frei.', en: '{free} of {total} reformers free.' },
  'class.waiting_count': { de: ' {count} auf der Warteliste.', en: ' {count} on the waiting list.' },
  'class.mirror': { de: 'Spiegel', en: 'Mirror' },
  'class.free': { de: 'Frei', en: 'Free' },
  'class.taken': { de: 'Belegt', en: 'Taken' },
  'class.not_available': { de: 'Nicht verfügbar', en: 'Not available' },
  'class.maintenance': { de: 'Wartung', en: 'Maintenance' },
  'class.sign_in_to_book': { de: 'Zum Buchen bitte', en: 'To book, please' },
  'class.sign_in_word': { de: 'anmelden', en: 'sign in' },
  'class.no_pass': { de: 'Du hast kein gültiges Abo mit Guthaben.', en: 'You have no valid pass with credits.' },
  'class.order_pass': { de: 'Abo bestellen', en: 'Order a pass' },
  'class.credits_row': { de: 'Guthaben: {count} · gültig bis {date}', en: 'Credits: {count} · valid until {date}' },
  'class.take_spot': { de: 'Platz übernehmen', en: 'Take the spot' },
  'class.confirm_booking': { de: 'Verbindlich buchen', en: 'Confirm booking' },
  'class.cancellation_rule': {
    de: 'Stornierung bis {hours} Stunden vor Beginn, danach verfällt das Guthaben.',
    en: 'Cancellation up to {hours} hours before the start; after that the credit is forfeited.',
  },
  'class.waitlist': { de: 'Warteliste', en: 'Waiting list' },
  'class.sign_in_to_join': { de: 'Zum Eintragen bitte', en: 'To join, please' },
  'class.waitlist_explain_before': {
    de: 'Diese Lektion ist ausgebucht. Trägst du dich ein, melden wir dich per E-Mail, sobald ein Platz frei wird — der Reihe nach. So nah am Termin hättest du dann',
    en: 'This class is fully booked. If you join, we will e-mail you as soon as a spot opens up — in order. This close to the date you would then have',
  },
  'class.waitlist_explain_after': { de: 'Zeit zu reagieren, danach geht das Angebot weiter.', en: 'to respond; after that the offer moves on.' },
  'class.join_waitlist': { de: 'Auf die Warteliste', en: 'Join the waiting list' },
  'class.your_turn': { de: 'Du bist an der Reihe — der Platz oben wartet auf dich.', en: 'It is your turn — the spot above is waiting for you.' },
  'class.offer_expired': { de: 'Dein Angebot ist abgelaufen und ging an die nächste Person.', en: 'Your offer has expired and passed to the next person.' },
  'class.position_row': { de: 'Du stehst auf Position {position} von {total}.', en: 'You are at position {position} of {total}.' },
  'class.leave_waitlist': { de: 'Von der Warteliste abmelden', en: 'Leave the waiting list' },

  // ------------------------------------------------------------ account
  'account.eyebrow': { de: 'Mein Konto', en: 'My account' },
  'account.booked': { de: 'Buchung bestätigt.', en: 'Booking confirmed.' },
  'account.cancel_credited': { de: 'Storniert, das Guthaben wurde zurückgebucht.', en: 'Cancelled, the credit has been returned.' },
  'account.cancel_forfeited': { de: 'Storniert. Innerhalb von {hours} Stunden verfällt das Guthaben.', en: 'Cancelled. Within {hours} hours the credit is forfeited.' },
  'account.passes': { de: 'Abos', en: 'Passes' },
  'account.no_pass': { de: 'Kein aktives Abo.', en: 'No active pass.' },
  'account.upcoming_classes': { de: 'Nächste Lektionen', en: 'Upcoming classes' },
  'account.no_bookings': { de: 'Keine gebuchten Lektionen.', en: 'No booked classes.' },
  'account.cancel': { de: 'Stornieren', en: 'Cancel' },
  'account.cancel_forfeits': { de: 'Stornieren, Guthaben verfällt', en: 'Cancel, credit will be forfeited' },
  'account.history': { de: 'Verlauf', en: 'History' },
  'account.cancelled_credited': { de: 'storniert, gutgeschrieben', en: 'cancelled, credited back' },
  'account.cancelled_forfeited': { de: 'storniert, verfallen', en: 'cancelled, forfeited' },

  // ------------------------------------------------------------ passes
  'passes.eyebrow': { de: 'Preise', en: 'Prices' },
  'passes.title': { de: 'Abos', en: 'Passes' },
  'passes.lead': {
    de: 'Alle Preise in Schweizer Franken. Die Bezahlung erfolgt bar im Studio oder per Rechnung — online mit Karte oder TWINT folgt später.',
    en: 'All prices in Swiss francs. Payment is made in cash at the studio or by invoice — online with card or TWINT is coming later.',
  },
  'passes.ordered': {
    de: 'Bestellung erhalten. Wir schalten dein Guthaben frei, sobald die Zahlung bei uns eingetroffen ist.',
    en: 'Order received. We will release your credits as soon as the payment has reached us.',
  },
  'passes.withdrawn': { de: 'Bestellung zurückgezogen.', en: 'Order withdrawn.' },
  'passes.open_order_title': { de: 'Deine offene Bestellung', en: 'Your open order' },
  'passes.open_order_validity': {
    de: 'Die Gültigkeit beginnt erst mit der Freischaltung — die Wartezeit geht nicht von deinem Abo ab.',
    en: 'Validity starts only when the pass is released — the waiting time does not come off your pass.',
  },
  'passes.withdraw_button': { de: 'Bestellung zurückziehen', en: 'Withdraw order' },
  'passes.reformer': { de: 'Reformer', en: 'Reformer' },
  'passes.reduced_title': { de: 'Young Member & Matten-Teilnehmende', en: 'Young members & mat Pilates participants' },
  'passes.reduced_text': {
    de: 'Reduzierter Tarif für 16- bis 24-Jährige und für Teilnehmerinnen unserer Matten-Pilates-Kurse.',
    en: 'Reduced rate for 16 to 24 year olds and for participants in our mat Pilates courses.',
  },
  'passes.reduced_offer': {
    de: 'Du bist zwischen 16 und 24 oder besuchst unsere Matten-Kurse? Dann steht dir ein reduzierter Tarif zu — melde dich bei uns, wir hinterlegen das in deinem Konto.',
    en: 'Are you between 16 and 24, or do you attend our mat courses? Then a reduced rate applies to you — get in touch and we will note it on your account.',
  },
  'passes.sign_in_to_order_before': { de: 'Zum Bestellen bitte', en: 'To order, please' },
  'passes.sign_in_to_order_after': { de: '.', en: '.' },
  'passes.fineprint': {
    de: 'Abos sind persönlich und nicht übertragbar. Nicht oder teilweise genutzte Abos werden nicht zurückerstattet. Bei Krankheit, Unfall oder Schwangerschaft kann ein Abo gegen Arztzeugnis pausiert werden.',
    en: 'Passes are personal and non-transferable. Unused or partly used passes are not refunded. In case of illness, accident or pregnancy a pass can be paused against a medical certificate.',
  },
  'passes.valid_for': { de: 'gültig', en: 'valid for' },
  'passes.order': { de: 'Bestellen', en: 'Order' },
  'passes.voucher_only': { de: ' · nur mit Gutschein', en: ' · voucher only' },
  'passes.days': { de: '{count} Tage', en: '{count} days' },
  'passes.one_month': { de: '1 Monat', en: '1 month' },
  'passes.months': { de: '{count} Monate', en: '{count} months' },
  'passes.pay_on_site': { de: 'Bar im Studio', en: 'Cash at the studio' },
  'passes.pay_transfer': { de: 'Banküberweisung', en: 'Bank transfer' },
  'passes.pay_voucher': { de: 'Gutschein', en: 'Voucher' },
  'passes.pay_online': { de: 'Karte / TWINT', en: 'Card / TWINT' },

  // ------------------------------------------------------------------ calendar
  'calendar.view': { de: 'Ansicht', en: 'View' },
  'calendar.day': { de: 'Tag', en: 'Day' },
  'calendar.week': { de: 'Woche', en: 'Week' },
  'calendar.month': { de: 'Monat', en: 'Month' },
  'calendar.today': { de: 'Heute', en: 'Today' },
  'calendar.previous': { de: 'Zurück', en: 'Previous' },
  'calendar.next': { de: 'Weiter', en: 'Next' },
  'calendar.no_classes': { de: 'In diesem Zeitraum keine Lektionen.', en: 'No classes in this period.' },
  'calendar.list': { de: 'Liste', en: 'List' },
  'calendar.free_count': { de: '{count} frei', en: '{count} free' },
  'calendar.fully_booked': { de: 'ausgebucht', en: 'fully booked' },
  'calendar.details': { de: 'Details anzeigen', en: 'Show details' },
  'calendar.book': { de: 'Buchen', en: 'Book' },
  'calendar.open': { de: 'Ansehen', en: 'Open' },
  'calendar.timezone': {
    de: 'Alle Zeiten in Schweizer Zeit.',
    en: 'All times in Swiss local time.',
  },
  'calendar.choose_week': { de: 'Woche wählen', en: 'Choose week' },

  // ------------------------------------------------------------ instructor view
  'teaching.title': { de: 'Unterricht', en: 'Teaching' },
  'teaching.lead_admin': { de: 'Alle Lektionen. Anwesenheit erfassen und Lektionen absagen.', en: 'All classes. Record attendance and cancel classes.' },
  'teaching.upcoming': { de: 'Kommende Lektionen', en: 'Upcoming classes' },
  'teaching.no_upcoming': { de: 'Keine kommenden Lektionen.', en: 'No upcoming classes.' },
  'teaching.past': { de: 'Vergangene Lektionen', en: 'Past classes' },
  'teaching.no_past': { de: 'Noch keine vergangenen Lektionen.', en: 'No past classes yet.' },
  'teaching.past_hint': {
    de: 'Nach der Lektion nur die Abwesenden markieren — wer angemeldet ist, gilt als anwesend. Nicht angerührte Lektionen schliessen sich nach {hours} Stunden von selbst.',
    en: 'After class, mark only who was absent — anyone booked counts as present. Classes you do not touch close themselves after {hours} hours.',
  },
  'teaching.registration': { de: 'Anmeldung', en: 'registration' },
  'teaching.registrations': { de: 'Anmeldungen', en: 'registrations' },
  'teaching.open': { de: 'offen', en: 'open' },
  'teaching.cancelled': { de: 'abgesagt', en: 'cancelled' },

  // ------------------------------------------------------------ class, instructor
  'lesson.participants': { de: 'Teilnehmerinnen ({count} von {total})', en: 'Participants ({count} of {total})' },
  'lesson.no_registrations': { de: 'Noch keine Anmeldungen.', en: 'No registrations yet.' },
  'lesson.attendance_saved': { de: 'Anwesenheit erfasst.', en: 'Attendance recorded.' },
  'lesson.closed': {
    de: 'Lektion geschlossen. {count} {word} als «besucht» erfasst.',
    en: 'Class closed. {count} {word} recorded as “attended”.',
  },
  'lesson.booking': { de: 'Buchung', en: 'booking' },
  'lesson.bookings': { de: 'Buchungen', en: 'bookings' },
  'lesson.cancelled_info': {
    de: 'Lektion abgesagt. {count} {word} informiert, Guthaben zurückgebucht.',
    en: 'Class cancelled. {count} {word} notified, credits returned.',
  },
  'lesson.person': { de: 'Person', en: 'person' },
  'lesson.people': { de: 'Personen', en: 'people' },
  'lesson.already_cancelled': { de: 'Diese Lektion ist abgesagt{reason}', en: 'This class is cancelled{reason}' },
  'lesson.col_name': { de: 'Name', en: 'Name' },
  'lesson.col_reformer': { de: 'Gerät', en: 'Reformer' },
  'lesson.col_attending_with': { de: 'Teilnahme', en: 'Attending with' },
  'lesson.col_status': { de: 'Status', en: 'Status' },
  'lesson.pass_remaining': { de: '{name} · noch {count}', en: '{name} · {count} left' },
  'lesson.pass_last': {
    de: '{name} · letzte Lektion',
    en: '{name} · last class',
  },
  'lesson.tag_mat': { de: 'Matten-Kundin', en: 'mat-class customer' },
  'lesson.tag_young': { de: 'Young Member', en: 'Young Member' },
  'lesson.health': { de: 'Gesundheit', en: 'Health' },
  'lesson.col_attendance': { de: 'Anwesenheit', en: 'Attendance' },
  'lesson.status_booked': { de: 'gebucht', en: 'booked' },
  'lesson.status_attended': { de: 'besucht', en: 'attended' },
  'lesson.status_no_show': { de: 'nicht erschienen', en: 'no show' },
  'lesson.status_cancelled': { de: 'storniert', en: 'cancelled' },
  'lesson.cancel_late': { de: ' (zu spät)', en: ' (too late)' },
  'lesson.cancel_studio': { de: ' (Studio)', en: ' (studio)' },
  'lesson.no_show_count': { de: '{count}× nicht erschienen', en: '{count}× no show' },
  'lesson.late_cancel_count': { de: '{count}× zu spät storniert', en: '{count}× cancelled too late' },
  'lesson.here': { de: 'da', en: 'here' },
  'lesson.absent': { de: 'war nicht da', en: 'was absent' },
  'lesson.was_here_after_all': { de: 'doch da', en: 'was here after all' },
  'lesson.counts_present': { de: 'gilt als anwesend', en: 'counts as present' },
  'lesson.close_button': {
    de: 'Übrige {count} als anwesend erfassen',
    en: 'Record the remaining {count} as present',
  },
  'lesson.attendance_hint': {
    de: 'Nur die Abwesenden markieren. Wer angemeldet ist, gilt als anwesend — automatisch nach {hours} Stunden, oder sofort mit dem Knopf unten.',
    en: 'Mark only who was absent. Anyone booked counts as present — automatically after {hours} hours, or right away with the button below.',
  },
  'lesson.auto_closed': {
    de: 'Automatisch geschlossen: alle Angemeldeten gelten als anwesend.',
    en: 'Closed automatically: everyone booked counts as present.',
  },
  'lesson.waitlist_title': { de: 'Warteliste ({count})', en: 'Waiting list ({count})' },
  'lesson.spot_offered': { de: 'Platz angeboten bis {date}', en: 'Spot offered until {date}' },
  'lesson.cancel_title': { de: 'Lektion absagen', en: 'Cancel class' },
  'lesson.cancel_hint': {
    de: 'Laut AGB wird das Guthaben bei einer Absage durch das Studio immer zurückgebucht — auch innerhalb der 24 Stunden. Alle Angemeldeten erhalten eine E-Mail.',
    en: 'Under the terms, a cancellation by the studio always returns the credit — even within the 24 hours. Everyone registered receives an e-mail.',
  },
  'lesson.reason_placeholder': { de: 'Grund, z. B. Krankheit der Trainerin', en: 'Reason, e.g. the instructor is ill' },
  'lesson.cancel_button': { de: 'Absagen und alle informieren', en: 'Cancel and notify everyone' },
  'lesson.too_few_button': {
    de: 'Wegen zu wenigen Anmeldungen absagen (Minimum 2)',
    en: 'Cancel for too few registrations (minimum 2)',
  },

  // ------------------------------------------------------------ administration
  'admin.eyebrow': { de: 'Verwaltung', en: 'Administration' },
  'admin.title': { de: 'Offene Bestellungen', en: 'Open orders' },
  'admin.released': {
    de: 'Abo freigeschaltet. Die Kundin wurde informiert und kann jetzt buchen.',
    en: 'Pass released. The customer has been notified and can now book.',
  },
  'admin.order_cancelled': { de: 'Bestellung storniert.', en: 'Order cancelled.' },
  'admin.lead': {
    de: 'Bezahlung bar im Studio oder per Überweisung. Sobald das Geld da ist, hier freischalten — die Gültigkeit beginnt dann, nicht bei der Bestellung.',
    en: 'Payment in cash at the studio or by transfer. As soon as the money is there, release it here — validity starts then, not at the time of ordering.',
  },
  'admin.no_open_orders': { de: 'Keine offenen Bestellungen.', en: 'No open orders.' },
  'admin.col_customer': { de: 'Kundin', en: 'Customer' },
  'admin.col_pass': { de: 'Abo', en: 'Pass' },
  'admin.col_amount': { de: 'Betrag', en: 'Amount' },
  'admin.col_payment_method': { de: 'Zahlungsart', en: 'Payment method' },
  'admin.col_ordered': { de: 'Bestellt', en: 'Ordered' },
  'admin.paid_button': { de: 'bezahlt', en: 'paid' },
  'admin.cancel_button': { de: 'stornieren', en: 'cancel' },
  'admin.recently_released': { de: 'Zuletzt freigeschaltet', en: 'Recently released' },
  'admin.no_active': { de: 'Noch keine aktiven Abos.', en: 'No active passes yet.' },
  'admin.paid_label': { de: 'bezahlt {date}', en: 'paid {date}' },

  // ------------------------------------------------------------ emails
  // Notification emails go in the RECIPIENT's language
  // (`users.language`), not that of whoever triggered the action.
  'email.greeting': { de: 'Liebe {name}', en: 'Dear {name}' },
  'email.greeting_generic': { de: 'Kundin', en: 'customer' },
  'email.signature': {
    de: '\n\nHerzliche Grüsse\nStudio Lumen\n\nZürich · Zug\nwww.studio-lumen.ch',
    en: '\n\nWarm regards\nStudio Lumen\n\nZürich · Zug\nwww.studio-lumen.ch',
  },
  'email.class_word': { de: 'Lektion', en: 'Class' },
  'email.in_city': { de: ' in {city}', en: ' in {city}' },

  'email.offer_subject': { de: 'Ein Platz ist frei geworden', en: 'A spot has opened up' },
  'email.offer_body': {
    de: 'auf der Warteliste ist ein Platz frei geworden:\n\n  {what}\n\nDu kannst ihn bis {deadline} buchen.\nDanach geht das Angebot an die nächste Person auf der Warteliste.\n\nPlatz buchen: {link}',
    en: 'a spot has opened up on the waiting list:\n\n  {what}\n\nYou can book it until {deadline}.\nAfter that the offer passes to the next person on the waiting list.\n\nBook the spot: {link}',
  },

  'email.released_subject': { de: 'Kurzfristig ein Platz frei', en: 'A spot free at short notice' },
  'email.released_body': {
    de: 'kurzfristig ist ein Platz frei geworden:\n\n  {what}\n\nSo kurz vor Beginn vergeben wir den Platz nicht mehr der Reihe nach —\nwer zuerst bucht, erhält ihn.\n\nJetzt buchen: {link}',
    en: 'a spot has opened up at short notice:\n\n  {what}\n\nThis close to the start we no longer give the spot out in order —\nwhoever books first gets it.\n\nBook now: {link}',
  },

  'email.change_subject': { de: 'Deine Lektion wurde geändert', en: 'Your class has been changed' },
  'email.change_body': {
    de: 'deine gebuchte Lektion hat sich geändert:\n\n{rows}\n\nDeine Buchung bleibt bestehen — du musst nichts tun.\nPasst der neue Termin nicht, kannst du bis 24 Stunden vorher\nkostenlos stornieren; das Guthaben kommt zurück.\n\nDeine Buchungen: {link}',
    en: 'your booked class has changed:\n\n{rows}\n\nYour booking stands — you do not need to do anything.\nIf the new time does not suit you, you can cancel free of charge\nup to 24 hours beforehand; the credit comes back.\n\nYour bookings: {link}',
  },
  'email.change_time': { de: 'Zeit:       ', en: 'Time:       ' },
  'email.change_instructor': { de: 'Leitung:    ', en: 'Instructor: ' },
  'email.change_location': { de: 'Ort:        ', en: 'Location:   ' },

  'email.cancel_subject': { de: 'Deine Lektion wurde abgesagt', en: 'Your class has been cancelled' },
  'email.cancel_body': {
    de: 'leider müssen wir diese Lektion absagen:\n\n  {what}\n\nGrund: {reason}\n{credits}\n\nDu kannst jederzeit einen neuen Termin buchen:\n{link}\n\nEs tut uns leid für die Umstände.',
    en: 'unfortunately we have to cancel this class:\n\n  {what}\n\nReason: {reason}\n{credits}\n\nYou can book a new date at any time:\n{link}\n\nWe are sorry for the inconvenience.',
  },
  'email.cancel_credited': {
    de: 'Deine Lektion wurde deinem Guthaben zurückgebucht.',
    en: 'Your class has been returned to your credit balance.',
  },
  'email.cancel_unchanged': {
    de: 'Dein Guthaben wurde nicht verändert.',
    en: 'Your credit balance has not been changed.',
  },

  'email.order_subject': { de: 'Deine Abo-Bestellung ist bei uns', en: 'We have received your pass order' },
  'email.order_body': {
    de: 'vielen Dank für deine Bestellung:\n\n  {pass} · {count} Lektionen · CHF {price}\n  Zahlungsart: {method}\n\n{instructions}\n\nDein Guthaben steht dir zur Verfügung, sobald wir die Zahlung\nbestätigt haben — danach kannst du direkt Lektionen buchen.\nDie Gültigkeit beginnt erst mit der Freischaltung, die Wartezeit\ngeht also nicht von deinem Abo ab.',
    en: 'thank you very much for your order:\n\n  {pass} · {count} classes · CHF {price}\n  Payment method: {method}\n\n{instructions}\n\nYour credits will be available as soon as we have confirmed the\npayment — after that you can book classes directly.\nValidity starts only when the pass is released, so the waiting\ntime does not come off your pass.',
  },
  'email.pay_on_site': { de: 'bar im Studio', en: 'cash at the studio' },
  'email.pay_transfer': { de: 'per Banküberweisung', en: 'by bank transfer' },
  'email.pay_voucher': { de: 'mit Gutschein', en: 'with a voucher' },
  'email.pay_online': { de: 'online mit Karte oder TWINT', en: 'online by card or TWINT' },

  'email.activation_subject': { de: 'Dein Abo ist freigeschaltet', en: 'Your pass is active' },
  'email.activation_body': {
    de: 'wir haben deine Zahlung erhalten — dein Abo ist freigeschaltet:\n\n  {pass} · {count} Lektionen\n  Gültig bis {valid}\n\nJetzt Lektion buchen: {link}\n\nWir freuen uns auf dich.',
    en: 'we have received your payment — your pass is active:\n\n  {pass} · {count} classes\n  Valid until {valid}\n\nBook a class now: {link}\n\nWe look forward to seeing you.',
  },

  // ------------------------------------------------------------ error messages
  // The `src/lib` layer returns these as keys, and the pages translate them.
  'error.pass_not_found': { de: 'Abo nicht gefunden.', en: 'Pass not found.' },
  'error.booking_not_found': { de: 'Buchung nicht gefunden.', en: 'Booking not found.' },
  'error.not_your_entry': { de: 'Das ist nicht dein Eintrag.', en: 'That is not your entry.' },
  'error.not_your_order': { de: 'Das ist nicht deine Bestellung.', en: 'That is not your order.' },
  'error.not_your_booking': { de: 'Das ist nicht deine Buchung.', en: 'That is not your booking.' },
  'error.reduced_only': {
    de: 'Der reduzierte Tarif gilt nur für Young Members (16–24) und Matten-Teilnehmende.',
    en: 'The reduced rate applies only to young members (16–24) and mat Pilates participants.',
  },
  'error.cancel_save_failed': { de: 'Die Absage konnte nicht gespeichert werden.', en: 'The cancellation could not be saved.' },
  'error.booking_save_failed': { de: 'Die Buchung konnte nicht gespeichert werden.', en: 'The booking could not be saved.' },
  'error.offer_expired': { de: 'Die Frist für dein Angebot ist abgelaufen.', en: 'The deadline for your offer has passed.' },
  'error.cancel_failed': { de: 'Die Stornierung ist fehlgeschlagen.', en: 'The cancellation failed.' },
  'error.order_not_open': { de: 'Diese Bestellung ist nicht offen.', en: 'This order is not open.' },
  'error.booking_not_active': { de: 'Diese Buchung ist nicht mehr aktiv.', en: 'This booking is no longer active.' },
  'error.class_missing': { de: 'Diese Lektion gibt es nicht.', en: 'This class does not exist.' },
  'error.class_started': { de: 'Diese Lektion hat bereits begonnen.', en: 'This class has already started.' },
  'error.class_not_started': { de: 'Diese Lektion hat noch nicht begonnen.', en: 'This class has not started yet.' },
  'error.class_full': { de: 'Diese Lektion ist ausgebucht.', en: 'This class is fully booked.' },
  'error.class_cancelled': { de: 'Diese Lektion wurde abgesagt.', en: 'This class has been cancelled.' },
  'error.pass_type_missing': { de: 'Dieses Abo gibt es nicht.', en: 'This pass does not exist.' },
  'error.pass_unavailable': { de: 'Dieses Abo ist derzeit nicht erhältlich.', en: 'This pass is currently not available.' },
  'error.pass_voucher_only': { de: 'Dieses Abo ist nur mit einem Gutschein erhältlich.', en: 'This pass is available only with a voucher.' },
  'error.reformer_taken': { de: 'Dieses Gerät ist nicht mehr frei.', en: 'This reformer is no longer free.' },
  'error.open_order_exists': {
    de: 'Du hast bereits eine offene Bestellung. Wir melden uns, sobald sie bestätigt ist.',
    en: 'You already have an open order. We will be in touch as soon as it is confirmed.',
  },
  'error.already_booked': { de: 'Du hast diese Lektion bereits gebucht.', en: 'You have already booked this class.' },
  'error.already_waiting': { de: 'Du stehst bereits auf der Warteliste.', en: 'You are already on the waiting list.' },
  'error.cancelled_no_attendance': {
    de: 'Eine stornierte Buchung kann nicht als anwesend erfasst werden.',
    en: 'A cancelled booking cannot be recorded as attended.',
  },
  'error.entry_not_found': { de: 'Eintrag nicht gefunden.', en: 'Entry not found.' },
  'error.offer_running': { de: 'Es läuft bereits ein Angebot.', en: 'An offer is already running.' },
  'error.spot_is_free': {
    de: 'Es sind noch Plätze frei — du kannst direkt buchen.',
    en: 'There are still spots free — you can book directly.',
  },
  'error.no_offer_for_you': { de: 'Für dich läuft kein Angebot.', en: 'There is no offer running for you.' },
  'error.no_free_spot': { de: 'Kein Platz frei.', en: 'No spot free.' },
  'error.no_valid_pass': { de: 'Kein gültiges Abo mit Guthaben vorhanden.', en: 'No valid pass with credits available.' },
  'error.class_not_found': { de: 'Lektion nicht gefunden.', en: 'Class not found.' },
  'error.class_not_bookable': { de: 'Lektion nicht mehr buchbar.', en: 'Class can no longer be booked.' },
  'error.nobody_waiting': { de: 'Niemand auf der Warteliste.', en: 'Nobody on the waiting list.' },
  'error.only_open_withdrawable': {
    de: 'Nur offene Bestellungen können zurückgezogen werden.',
    en: 'Only open orders can be withdrawn.',
  },
  'error.closed': {
    de: 'In diesem Zeitraum finden keine Lektionen statt.',
    en: 'No classes take place during this period.',
  },
  'error.enough_registrations': {
    de: 'Es sind genügend Anmeldungen — das Minimum ist erreicht.',
    en: 'There are enough registrations — the minimum has been reached.',
  },
  'error.generic': { de: 'Fehler', en: 'Error' },
  'error.wrong_password': { de: 'E-Mail oder Passwort stimmt nicht.', en: 'E-mail or password is not correct.' },
  'error.sign_in_failed': { de: 'Anmeldung fehlgeschlagen.', en: 'Sign-in failed.' },
  'error.class_invalid_time': { de: 'Datum oder Uhrzeit stimmt nicht.', en: 'The date or time is not valid.' },
  'error.class_invalid_duration': { de: 'Die Dauer muss zwischen 1 und 300 Minuten liegen.', en: 'The duration must be between 1 and 300 minutes.' },
  'error.class_in_past': { de: 'Eine Lektion in der Vergangenheit lässt sich nicht anlegen.', en: 'A class in the past cannot be created.' },
  'error.class_missing_data': { de: 'Kursart oder Studio fehlt.', en: 'The class type or studio is missing.' },
  'error.not_an_instructor': { de: 'Diese Person ist keine Trainerin.', en: 'That person is not an instructor.' },
  'error.class_conflict': { de: 'Diese Trainerin hat zu dieser Zeit schon eine Lektion.', en: 'That instructor already has a class at this time.' },
  'error.class_has_registrations': {
    de: 'Es sind Personen angemeldet — bitte die Lektion absagen statt löschen.',
    en: 'People are booked — cancel the class instead of deleting it.',
  },
  'error.reason_required': { de: 'Bitte einen Grund angeben.', en: 'Please give a reason.' },
  // ------------------------------------------------------------ customers (studio)
  'customer.eyebrow': { de: 'Studio', en: 'Studio' },
  'customer.list_title': { de: 'Kundinnen & Kunden', en: 'Customers' },
  'customer.list_lead': {
    de: 'Alle angemeldeten Personen. Tippe auf einen Namen für Kontakt, Hinweise und die besuchten Lektionen.',
    en: 'Everyone with an account. Tap a name for contact details, notes and the classes they attended.',
  },
  'customer.search_placeholder': { de: 'Name oder E-Mail', en: 'Name or e-mail' },
  'customer.search_button': { de: 'Suchen', en: 'Search' },
  'customer.search_clear': { de: 'Suche zurücksetzen', en: 'Clear search' },
  'customer.no_match': { de: 'Niemand gefunden.', en: 'Nobody found.' },
  'customer.nobody': { de: 'Noch keine Kundinnen.', en: 'No customers yet.' },
  'customer.count': { de: '{count} Personen', en: '{count} people' },
  'customer.count_one': { de: '1 Person', en: '1 person' },
  'customer.col_name': { de: 'Name', en: 'Name' },
  'customer.col_contact': { de: 'Kontakt', en: 'Contact' },
  'customer.col_notes': { de: 'Hinweise', en: 'Notes' },
  'customer.has_health_note': { de: 'gesundheitlicher Hinweis', en: 'health note' },
  'customer.list_back': { de: '← Kundinnen & Kunden', en: '← Customers' },
  'customer.not_found': { de: 'Diese Person gibt es nicht.', en: 'No such person.' },
  'customer.instructor_tag': { de: 'Trainerin', en: 'Instructor' },
  'customer.admin_tag': { de: 'Administration', en: 'Administration' },
  'customer.contact_title': { de: 'Kontakt', en: 'Contact' },
  'customer.phone': { de: 'Telefon', en: 'Phone' },
  'customer.no_phone': { de: 'keine Nummer hinterlegt', en: 'no number on file' },
  'customer.birth_year': { de: 'Jahrgang', en: 'Year of birth' },
  'customer.language': { de: 'Sprache', en: 'Language' },
  'customer.health_title': { de: 'Gesundheitliche Hinweise', en: 'Health notes' },
  'customer.no_health_note': {
    de: 'Keine Hinweise hinterlegt. Ergänzen kannst du sie im Admin-Bereich.',
    en: 'Nothing on file. You can add notes in the admin area.',
  },
  'customer.edit_in_admin': { de: 'Im Admin bearbeiten', en: 'Edit in admin' },
  'customer.passes_title': { de: 'Abos', en: 'Passes' },
  'customer.no_pass': { de: 'Noch kein Abo.', en: 'No pass yet.' },
  'customer.pass_credits': { de: '{count} Guthaben', en: '{count} credits' },
  'customer.pass_credits_one': { de: '1 Guthaben', en: '1 credit' },
  'customer.credits_total': { de: 'Guthaben insgesamt: {count}', en: 'Credits in total: {count}' },
  'customer.pass_status_pending': { de: 'Zahlung offen', en: 'payment pending' },
  'customer.pass_status_active': { de: 'aktiv', en: 'active' },
  'customer.pass_status_expired': { de: 'abgelaufen', en: 'expired' },
  'customer.pass_status_cancelled': { de: 'storniert', en: 'cancelled' },
  'customer.upcoming_title': { de: 'Angemeldet für', en: 'Booked for' },
  'customer.no_upcoming': { de: 'Aktuell für keine Lektion angemeldet.', en: 'Not booked for any class right now.' },
  'customer.past_title': { de: 'Vergangene Lektionen', en: 'Past classes' },
  'customer.no_past': { de: 'Noch keine Lektion besucht.', en: 'No classes yet.' },
  'customer.open_attendance': {
    de: '{count}× noch nicht erfasst — die Anwesenheit trägt man auf der Lektionsseite nach.',
    en: '{count}× not recorded yet — attendance is filled in on the class page.',
  },
  'customer.stats': {
    de: '{attended}× besucht · {no_show}× nicht erschienen · {late}× zu spät storniert · {in_time}× rechtzeitig storniert',
    en: '{attended}× attended · {no_show}× no show · {late}× cancelled too late · {in_time}× cancelled in time',
  },
  'customer.show_more': { de: 'Weitere {count} anzeigen', en: 'Show {count} more' },
  'customer.customers': { de: 'Kundinnen', en: 'Customers' },
  // ------------------------------------------------------------ creating / deleting a class
  'newclass.title': { de: 'Lektion hinzufügen', en: 'Add a class' },
  'newclass.open': { de: '+ Lektion hinzufügen', en: '+ Add a class' },
  'newclass.close': { de: 'Abbrechen', en: 'Cancel' },
  'newclass.hint': {
    de: 'Für einzelne Termine: Workshop, Ersatzlektion, Nachholtermin. Regelmässige Lektionen laufen über die Serien im Admin-Bereich.',
    en: 'For one-off dates: a workshop, a replacement class, a make-up session. Recurring classes run through the series in the admin area.',
  },
  'newclass.date': { de: 'Datum', en: 'Date' },
  'newclass.time': { de: 'Beginn', en: 'Starts at' },
  'newclass.class_type': { de: 'Kursart', en: 'Class type' },
  'newclass.studio': { de: 'Studio', en: 'Studio' },
  'newclass.instructor': { de: 'Trainerin', en: 'Instructor' },
  'newclass.duration': { de: 'Dauer in Minuten', en: 'Duration in minutes' },
  'newclass.language': { de: 'Sprache', en: 'Language' },
  'newclass.language_auto': { de: 'Sprachen der Trainerin', en: 'The instructor’s languages' },
  'newclass.note': { de: 'Hinweis (optional)', en: 'Note (optional)' },
  'newclass.button': { de: 'Lektion anlegen', en: 'Create class' },
  'newclass.created': { de: 'Lektion angelegt. Sie steht ab sofort im Stundenplan.', en: 'Class created. It is now on the schedule.' },
  'newclass.delete_title': { de: 'Lektion löschen', en: 'Delete class' },
  'newclass.delete_hint': {
    de: 'Nur solange niemand angemeldet ist. Gibt es Anmeldungen, sag die Lektion ab — dann bekommen alle ihr Guthaben zurück und eine Nachricht.',
    en: 'Only while nobody is booked. If there are registrations, cancel the class instead — everyone gets their credit back and a message.',
  },
  'newclass.delete_button': { de: 'Endgültig löschen', en: 'Delete permanently' },
  'newclass.deleted': { de: 'Lektion gelöscht.', en: 'Class deleted.' },
} as const

export type DictionaryKey = keyof typeof DICTIONARY

/** The key of an error message — what the `src/lib` functions return. */
export type ErrorKey = Extract<DictionaryKey, `error.${string}`>

const interpolate = (text: string, values?: Record<string, string | number>) =>
  values
    ? text.replace(/\{(\w+)\}/g, (whole, name) =>
        name in values ? String(values[name]) : whole,
      )
    : text

/**
 * A translator bound to the given language.
 *
 *     const t = translator('en')
 *     t('account.cancel_forfeited', { hours: 24 })
 */
export const translator = (lang: Lang) =>
  (key: DictionaryKey, values?: Record<string, string | number>): string =>
    interpolate(DICTIONARY[key][lang], values)

export type Translator = ReturnType<typeof translator>

/** True if the string is a dictionary key — for validating the `?fehler=` parameter. */
export const isDictionaryKey = (v: unknown): v is DictionaryKey =>
  typeof v === 'string' && v in DICTIONARY
