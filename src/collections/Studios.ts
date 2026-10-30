import type { CollectionConfig } from 'payload'

/**
 * Egy stúdió = egy terem. A reformerek pozícióját sor/oszlop rácson
 * tároljuk, ebből rajzolja a foglalási felület a teremtérképet.
 *
 * Zürich: 5 gép, a tükör előtt 2, mögötte 3.
 * Zug: 6 gép, hosszabb terem, 2 + 2 + 2.
 */
export const Studios: CollectionConfig = {
  slug: 'studios',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'reformerCount'],
    group: 'Studio',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'city', type: 'text', label: 'Ort', required: true },
    { name: 'street', type: 'text', label: 'Strasse' },
    { name: 'postalCode', type: 'text', label: 'PLZ' },
    {
      name: 'rows',
      type: 'number',
      label: 'Anzahl Reihen',
      required: true,
      admin: { description: 'Reihe 1 steht direkt vor dem Spiegel.' },
    },
    {
      name: 'reformerCount',
      type: 'number',
      label: 'Anzahl Reformer',
      admin: { readOnly: true, description: 'Wird aus den Reformern berechnet.' },
    },
  ],
}
