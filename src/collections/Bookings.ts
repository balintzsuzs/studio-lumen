import type { CollectionConfig } from 'payload'

/**
 * One booking: who, for which class, on which machine.
 *
 * There is no `uniqueReformerPerSession` index; the application layer
 * makes up for it by checking inside a transaction that the machine is
 * free. Under SQLite that is enough; when moving to Postgres it is
 * worth adding a real unique index (session + reformer, where
 * status = 'booked').
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: 'Buchung', plural: 'Buchungen' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['session', 'customer', 'reformer', 'status'],
    group: 'Stundenplan',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      // Instructors see every booking, not only their own classes':
      // they cover for each other, and still need to know who is
      // coming.
      if (user.role === 'instructor') return true
      return { customer: { equals: user.id } }
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { customer: { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'session', type: 'relationship', relationTo: 'sessions', required: true },
    { name: 'customer', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'reformer',
      type: 'relationship',
      relationTo: 'reformers',
      admin: { description: 'Leer bei Kursen ohne Gerät.' },
    },
    { name: 'abo', type: 'relationship', relationTo: 'abos', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'booked',
      options: [
        { label: 'Gebucht', value: 'booked' },
        { label: 'Storniert', value: 'cancelled' },
        { label: 'Nicht erschienen', value: 'no_show' },
        { label: 'Besucht', value: 'attended' },
      ],
    },
    { name: 'bookedAt', type: 'date', label: 'Gebucht am', required: true },
    { name: 'cancelledAt', type: 'date', label: 'Storniert am' },
    {
      // Stored separately, because "was the credit refunded" is not
      // the same question: the studio may refund a late cancellation
      // out of goodwill, but the fact that it was late should stay in
      // the record.
      name: 'cancellationType',
      type: 'select',
      label: 'Art der Stornierung',
      options: [
        { label: 'Rechtzeitig', value: 'in_time' },
        { label: 'Zu spät', value: 'late' },
        { label: 'Durch das Studio', value: 'by_studio' },
      ],
      admin: { condition: (data) => data?.status === 'cancelled' },
    },
    {
      name: 'attendanceMarkedAt',
      type: 'date',
      label: 'Anwesenheit erfasst am',
      admin: { readOnly: true },
    },
    {
      name: 'creditRefunded',
      type: 'checkbox',
      label: 'Guthaben zurückgebucht',
      defaultValue: false,
      admin: { description: 'Nur bei Stornierung mehr als 24 Stunden vorher.' },
    },
  ],
}
