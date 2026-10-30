import type { CollectionConfig } from 'payload'

/**
 * Elküldött értesítések naplója.
 *
 * Nem csak audit: a prototípusban nincs e-mail szolgáltató, ezért a levél
 * a konzolra megy, és itt marad meg olvashatóan. Nadine így utólag is
 * látja, ki mit kapott — ez a gyakorlatban többet ér, mint a postafiókja.
 */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Benachrichtigung', plural: 'Benachrichtigungen' },
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['sentAt', 'type', 'recipientEmail', 'subject', 'status'],
    group: 'Einstellungen',
    description: 'Was das System an Kundinnen geschickt hat.',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { recipient: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Wartelisten-Angebot', value: 'waitlist_offer' },
        { label: 'Warteliste freigegeben', value: 'waitlist_released' },
        { label: 'Lektion verschoben', value: 'session_changed' },
        { label: 'Lektion abgesagt', value: 'session_cancelled' },
        { label: 'Buchung bestätigt', value: 'booking_confirmed' },
        { label: 'Abo bestellt', value: 'abo_ordered' },
        { label: 'Abo freigeschaltet', value: 'abo_activated' },
      ],
    },
    { name: 'recipient', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'recipientEmail',
      type: 'text',
      label: 'An',
      required: true,
      admin: { description: 'Zum Zeitpunkt des Versands — bleibt auch nach Namensänderung lesbar.' },
    },
    { name: 'subject', type: 'text', label: 'Betreff', required: true },
    { name: 'body', type: 'textarea', label: 'Text', required: true },
    { name: 'session', type: 'relationship', relationTo: 'sessions' },
    { name: 'booking', type: 'relationship', relationTo: 'bookings' },
    { name: 'sentAt', type: 'date', label: 'Gesendet am', required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'sent',
      options: [
        { label: 'Gesendet', value: 'sent' },
        { label: 'Fehlgeschlagen', value: 'failed' },
        { label: 'Nur protokolliert', value: 'logged' },
      ],
    },
    { name: 'error', type: 'text', label: 'Fehler', admin: { readOnly: true } },
  ],
}
