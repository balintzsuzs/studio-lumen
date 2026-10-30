import type { CollectionConfig } from 'payload'

/**
 * Egy foglalás: ki, melyik órára, melyik gépre.
 *
 * Az `uniqueReformerPerSession` index hiányát az alkalmazásrétegben
 * pótoljuk: a foglalás létrehozása tranzakcióban ellenőrzi, hogy a gép
 * szabad-e. SQLite alatt ez elég, Postgresre váltáskor érdemes valódi
 * egyedi indexet is tenni (session + reformer, ahol status = 'booked').
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
      // Az oktatók minden foglalást látnak, nem csak a saját óráikét:
      // beugranak egymás helyett, és akkor is tudniuk kell, ki jön.
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
      // Külön tároljuk, mert a "guthaben visszajárt-e" nem ugyanaz:
      // egy késői lemondást a stúdió jóindulatból is visszatéríthet,
      // de a tény, hogy késő volt, a statisztikában maradjon meg.
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
