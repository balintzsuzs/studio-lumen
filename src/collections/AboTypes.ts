import type { CollectionConfig } from 'payload'

/**
 * A pass type that can be bought. It models the usual studio pass:
 * a number of credits plus a validity measured in months, with a
 * reduced tier alongside.
 *
 * Prices (invented, as is everything else in this project):
 *   Schnupperlektion  CHF  35 /  1 credit /  1 week
 *   Einzelstunde      CHF  45 /  1 credit /  1 week
 *   5er Abo           CHF 215 /  5 credits /  5 months
 *   10er Abo          CHF 400 / 10 credits /  7 months
 *   20er Abo          CHF 760 / 20 credits / 12 months
 *   3er Abo           CHF 129 /  3 credits /  3 months (voucher only)
 * Young Member (16-24): 25 / 40 / 195 / 360
 */
export const AboTypes: CollectionConfig = {
  slug: 'abo-types',
  labels: { singular: 'Abo-Typ', plural: 'Abo-Typen' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'credits', 'priceChf', 'tier', 'active'],
    group: 'Abos',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'credits',
      type: 'number',
      required: true,
      admin: { description: 'Wie viele Lektionen das Abo enthält.' },
    },
    {
      name: 'priceChf',
      type: 'number',
      label: 'Preis in CHF',
      required: true,
    },
    {
      name: 'validMonths',
      type: 'number',
      label: 'Gültigkeit in Monaten',
      required: true,
      admin: { description: 'Eine Woche entspricht etwa 0.25 Monaten.' },
    },
    {
      name: 'tier',
      type: 'select',
      label: 'Tarif',
      required: true,
      defaultValue: 'standard',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Young Member', value: 'reduced' },
      ],
    },
    {
      name: 'voucherOnly',
      type: 'checkbox',
      label: 'Nur mit Gutschein',
      defaultValue: false,
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Buchbar',
      defaultValue: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Reihenfolge',
      defaultValue: 100,
    },
  ],
}
