import type { GlobalConfig } from 'payload'

/**
 * The booking rules in one place, so the studio can change them without
 * anyone having to touch code.
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
       * There is no "how far ahead you may book" limit, and that is
       * deliberate. This field advertised 30 days, except the code
       * never looked at it: a switch that switched nothing — and worse
       * than its absence, because it promised to protect against
       * something. Every published class is bookable immediately; if a
       * class should not be available yet, do not publish it.
       *
       * Kept hidden rather than deleted so the existing database column
       * does not have to be dropped — the same reasoning as for
       * `waitlistOfferHours` below. Do not use it.
       */
      name: 'bookingOpensDays',
      type: 'number',
      label: 'Buchbar ab (Tage im Voraus) — ohne Wirkung',
      admin: { hidden: true },
    },
    {
      // The sliding waitlist window. The closer the class, the shorter
      // the offer stays valid, otherwise the freed-up spot is lost.
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
      // The old fixed offer duration, superseded by the sliding
      // `waitlistWindows`. It stays only so the existing database
      // column does not have to be renamed. Do not use it.
      name: 'waitlistOfferHours',
      type: 'number',
      label: 'Warteliste: Angebot gültig für (Stunden) — veraltet',
      admin: { hidden: true },
    },
    {
      // Payment instructions for the order confirmation email.
      // Deliberately contains no IBAN or account number: the studio
      // owner has to fill that in, and we cannot guess it.
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
      // The last run of the lazy scheduler. Not a setting; this is
      // simply the least roundabout place for it, because a Payload
      // global is one row that every server instance can see.
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
