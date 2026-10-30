import type { CollectionConfig } from 'payload'

/**
 * One studio = one room. Reformer positions are stored on a row/column
 * grid, and the booking screen draws the floor plan from it.
 *
 * Zürich: 6 machines, three rows of 2, the first row at the mirror.
 * Zug: 4 machines, a smaller room, two rows of 2.
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
