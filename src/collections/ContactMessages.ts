import type { CollectionConfig } from 'payload'

/**
 * A weboldal kapcsolati űrlapjának bejövő üzenetei.
 *
 * A statikus oldalon ez egy `mailto:` link volt, mert nem volt backend.
 * Most van: az üzenet itt landol, Nadine az adminban látja, és nem
 * veszik el, ha a levél spamba kerül.
 */
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Nachricht', plural: 'Nachrichten' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['receivedAt', 'lastName', 'email', 'status'],
    group: 'Einstellungen',
    description: 'Was über das Kontaktformular der Website hereinkommt.',
  },
  access: {
    // Bárki küldhet, csak a stúdió olvassa.
    create: () => true,
    read: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'instructor',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'firstName', type: 'text', label: 'Vorname' },
    { name: 'lastName', type: 'text', label: 'Name', required: true },
    { name: 'email', type: 'email', label: 'E-Mail', required: true },
    { name: 'phone', type: 'text', label: 'Telefon' },
    { name: 'subject', type: 'text', label: 'Betreff' },
    { name: 'message', type: 'textarea', label: 'Nachricht', required: true },
    { name: 'receivedAt', type: 'date', label: 'Eingegangen am', required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Neu', value: 'new' },
        { label: 'Beantwortet', value: 'answered' },
        { label: 'Erledigt', value: 'done' },
      ],
    },
    { name: 'internalNote', type: 'textarea', label: 'Interne Notiz' },
  ],
}
