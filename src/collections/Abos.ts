import type { CollectionConfig } from 'payload'

/**
 * Egy ügyfél konkrét, megvásárolt abo-ja. A `creditsRemaining` az
 * egyetlen forrás az egyenlegre; a foglalás és a lemondás ezt írja,
 * mindig tranzakcióban, hogy két egyidejű foglalás ne ronthassa el.
 */
export const Abos: CollectionConfig = {
  slug: 'abos',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['customer', 'aboType', 'creditsRemaining', 'expiresAt', 'status'],
    group: 'Abos',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { customer: { equals: user.id } }
    },
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'customer', type: 'relationship', relationTo: 'users', required: true },
    { name: 'aboType', type: 'relationship', relationTo: 'abo-types', required: true },
    {
      name: 'creditsRemaining',
      type: 'number',
      label: 'Verbleibende Guthaben',
      required: true,
    },
    { name: 'purchasedAt', type: 'date', label: 'Gekauft am', required: true },
    { name: 'expiresAt', type: 'date', label: 'Gültig bis', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Bestellt, Zahlung offen', value: 'pending' },
        { label: 'Aktiv', value: 'active' },
        { label: 'Abgelaufen', value: 'expired' },
        { label: 'Storniert', value: 'cancelled' },
      ],
      admin: {
        description:
          'Bestellt = die Kundin hat das Abo angefordert, aber noch nicht bezahlt. Erst «Aktiv» kann gebucht werden.',
      },
    },
    {
      // A fizetés módja az AGB szerint: helyszíni készpénz vagy
      // banki átutalás. A kártya/TWINT csak később, Stripe-pal.
      name: 'paymentMethod',
      type: 'select',
      label: 'Zahlungsart',
      defaultValue: 'on_site',
      options: [
        { label: 'Bar im Studio', value: 'on_site' },
        { label: 'Banküberweisung', value: 'transfer' },
        { label: 'Gutschein', value: 'voucher' },
        { label: 'Karte / TWINT (online)', value: 'online' },
      ],
    },
    {
      name: 'orderedAt',
      type: 'date',
      label: 'Bestellt am',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Wann die Kundin das Abo angefordert hat.',
      },
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Bezahlt am',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Wird gesetzt, sobald die Zahlung bestätigt ist.',
      },
    },
    {
      name: 'note',
      type: 'text',
      label: 'Notiz',
      admin: { description: 'Z. B. Gutscheinnummer oder Hinweis zur Zahlung.' },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      label: 'Stripe Payment Intent',
      admin: { readOnly: true, description: 'Leer, solange nicht online bezahlt wurde.' },
    },
  ],
}
