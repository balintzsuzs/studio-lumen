import type { CollectionConfig } from 'payload'

/**
 * A closure: a period with no classes.
 *
 * It can differ per class type and per studio, so it is not a fixed
 * rule but a period you enter:
 *
 *   - Christmas and New Year week, for instance, which the owner
 *     confirms rather than the system assuming it
 *
 * An empty `classTypes` or `studios` means it applies to all of them.
 */
export const ClosurePeriods: CollectionConfig = {
  slug: 'closure-periods',
  labels: { singular: 'Schliessung', plural: 'Schliessungen' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'startsOn', 'endsOn'],
    group: 'Stundenplan',
    description:
      'Zeiträume ohne Lektionen, zum Beispiel Schulferien oder die Weihnachtswoche. '
      + 'Leer gelassene Felder bedeuten: gilt für alle.',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Zum Beispiel "Sportferien Zürich 2027".' },
    },
    { name: 'startsOn', type: 'date', label: 'Von', required: true },
    { name: 'endsOn', type: 'date', label: 'Bis und mit', required: true },
    {
      name: 'classTypes',
      type: 'relationship',
      relationTo: 'class-types',
      hasMany: true,
      label: 'Betrifft diese Kursarten',
      admin: {
        description:
          'Leer lassen für alle Kursarten, sonst gilt die Schliessung nur für die gewählten.',
      },
    },
    {
      name: 'studios',
      type: 'relationship',
      relationTo: 'studios',
      hasMany: true,
      label: 'Betrifft diese Studios',
      admin: { description: 'Leer lassen für beide Studios.' },
    },
    { name: 'note', type: 'textarea', label: 'Notiz' },
  ],
}
