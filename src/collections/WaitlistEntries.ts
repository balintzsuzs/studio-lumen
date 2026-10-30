import type { CollectionConfig } from 'payload'

/**
 * The waitlist. On a cancellation the first person in the queue gets an
 * email and a time window (`offerExpiresAt`) in which to book the
 * freed-up spot.
 */
export const WaitlistEntries: CollectionConfig = {
  slug: 'waitlist-entries',
  labels: { singular: 'Warteliste', plural: 'Warteliste' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['session', 'customer', 'position', 'status'],
    group: 'Stundenplan',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin' || user.role === 'instructor') return true
      return { customer: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { customer: { equals: user.id } }
    },
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'session', type: 'relationship', relationTo: 'sessions', required: true },
    { name: 'customer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'position', type: 'number', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'waiting',
      options: [
        { label: 'Wartet', value: 'waiting' },
        { label: 'Platz angeboten', value: 'offered' },
        { label: 'Gebucht', value: 'converted' },
        { label: 'Abgelaufen', value: 'expired' },
        { label: 'Zurückgezogen', value: 'withdrawn' },
      ],
    },
    { name: 'notifiedAt', type: 'date', label: 'Benachrichtigt am' },
    { name: 'offerExpiresAt', type: 'date', label: 'Angebot gültig bis' },
  ],
}
