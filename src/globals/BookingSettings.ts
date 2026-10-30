import type { GlobalConfig } from 'payload'

/**
 * A foglalási szabályok egy helyen, hogy Nadine tudja állítani őket
 * anélkül, hogy kódot kellene módosítani.
 */
export const BookingSettings: GlobalConfig = {
  slug: 'booking-settings',
  label: 'Buchungsregeln',
  admin: { group: 'Einstellungen' },
  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'cancellationHours',
      type: 'number',
      label: 'Kostenlose Stornierung bis (Stunden vorher)',
      required: true,
      defaultValue: 24,
      admin: {
        description:
          'Wird innerhalb dieser Frist storniert, verfällt das Guthaben. Aktuell 24 Stunden.',
      },
    },
    {
      /*
       * Nincs „meddig előre lehet foglalni" korlát, és szándékosan nincs.
       * Ez a mező 30 napot hirdetett, csakhogy a kód soha nem nézte meg:
       * egy kapcsoló, ami nem kapcsolt semmit — és rosszabb a hiányánál,
       * mert azt ígérte, hogy véd valamitől. Minden meghirdetett óra
       * azonnal foglalható; ha egy óra még ne legyen elérhető, akkor nem
       * kell meghirdetni.
       *
       * Rejtve marad, nem törölve, hogy a meglévő adatbázis-oszlopot ne
       * kelljen eldobni — ugyanaz a megfontolás, mint a lenti
       * `waitlistOfferHours`-nál. Ne használd.
       */
      name: 'bookingOpensDays',
      type: 'number',
      label: 'Buchbar ab (Tage im Voraus) — ohne Wirkung',
      admin: { hidden: true },
    },
    {
      // Lépcsőzetes várólista-ablak. Minél közelebb az óra, annál rövidebb
      // ideig érvényes az ajánlat, különben a felszabadult hely elveszik.
      name: 'waitlistWindows',
      type: 'array',
      label: 'Warteliste: Angebotsfrist',
      labels: { singular: 'Stufe', plural: 'Stufen' },
      admin: {
        description:
          'Je näher die Lektion, desto kürzer die Frist. Die erste Stufe, deren Vorlaufzeit erreicht ist, gilt — darum von gross nach klein sortieren.',
      },
      defaultValue: [
        { fromHoursBefore: 48, offerMinutes: 720 },
        { fromHoursBefore: 13, offerMinutes: 240 },
        { fromHoursBefore: 0, offerMinutes: 20 },
      ],
      fields: [
        {
          name: 'fromHoursBefore',
          type: 'number',
          label: 'Ab Stunden vor der Lektion',
          required: true,
          admin: { description: 'Diese Stufe gilt, wenn mindestens so viele Stunden bis zum Beginn bleiben.' },
        },
        {
          name: 'offerMinutes',
          type: 'number',
          label: 'Frist in Minuten',
          required: true,
        },
      ],
    },
    {
      name: 'waitlistLockHours',
      type: 'number',
      label: 'Warteliste: keine Angebote mehr ab (Stunden vorher)',
      required: true,
      defaultValue: 1,
      admin: {
        description:
          'So kurz vor Beginn wird kein Platz mehr angeboten — der Platz wird direkt für alle freigegeben.',
      },
    },
    {
      // Régi, fix ajánlati idő. A lépcsőzetes `waitlistWindows` váltotta
      // fel; csak azért marad itt, hogy a meglévő adatbázis-oszlopot ne
      // kelljen átnevezni. Ne használd.
      name: 'waitlistOfferHours',
      type: 'number',
      label: 'Warteliste: Angebot gültig für (Stunden) — veraltet',
      admin: { hidden: true },
    },
    {
      // Fizetési útmutató a megrendelés visszaigazoló levelébe.
      // Szándékosan nincs benne IBAN vagy számlaszám: azt a stúdió tulajdonosának
      // kell beírnia, nem tippelhetjük meg.
      name: 'paymentInstructions',
      type: 'textarea',
      label: 'Zahlungshinweise für Abo-Bestellungen',
      defaultValue:
        'Bezahlung bar im Studio oder per Banküberweisung. Die Rechnung mit QR-Code senden wir dir zu, zahlbar innert 10 Tagen. Sobald die Zahlung bei uns eingetroffen ist, schalten wir dein Guthaben frei.',
      admin: {
        description:
          'Erscheint in der Bestellbestätigung. Bankverbindung hier eintragen, wenn sie mitgeschickt werden soll.',
      },
    },
    {
      // A lusta ütemező utolsó futása. Nem beállítás, csak itt van a
      // legkevesebb kerülőút: a Payload global egyetlen sor, amit minden
      // szerverpéldány lát.
      name: 'lastWaitlistTickAt',
      type: 'date',
      label: 'Warteliste zuletzt geprüft',
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'allowReformerChoice',
      type: 'checkbox',
      label: 'Gerätewahl durch Kundinnen erlauben',
      defaultValue: true,
    },
  ],
}
