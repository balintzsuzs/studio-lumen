import type { CollectionConfig } from 'payload'

/**
 * Megvásárolható abo-típus. A stúdiókban szokásos bérletmodellt képezi le:
 * kreditszám + hónapban mért érvényesség, plusz a kedvezményes sáv.
 *
 * Jelenlegi árak (2026-10):
 *   Schnupperlektion  CHF  30 /  1 kredit /  1 hét
 *   Einzelstunde      CHF  49 /  1 kredit /  1 hét
 *   5er Abo           CHF 230 /  5 kredit /  5 hónap
 *   10er Abo          CHF 420 / 10 kredit /  7 hónap
 *   20er Abo          CHF 800 / 20 kredit / 12 hónap
 *   3er Abo           CHF 138 /  3 kredit /  3 hónap (csak utalvánnyal)
 * Young Member (16-24) és matten-résztvevő: 20 / 45 / 207 / 378
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
        { label: 'Young Member / Matten-Teilnehmende', value: 'reduced' },
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
