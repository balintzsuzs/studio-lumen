import type { CollectionConfig } from 'payload'

/**
 * Zárva tartás: olyan időszak, amikor nincsenek órák.
 *
 * Óratípusonként és stúdiónként eltérhet, ezért nem fix szabály,
 * hanem felvehető időszak:
 *
 *   - Matten Pilates: az Arth-Zürich iskolai szünetekben nincs óra
 *     (így szól a matten AGB)
 *   - Reformer: iskolai szünetben IS van óra
 *   - Karácsony és újév hete: a matten AGB szerint zárva; reformerre
 *     a tulajdonosnak kell megerősítenie, ezért nincs előre beégetve
 *
 * Üresen hagyott `classTypes` vagy `studios` = mindre vonatkozik.
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
      admin: { description: 'Zum Beispiel "Sportferien Arth-Zürich 2027".' },
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
          'Leer lassen für alle Kursarten. Die Schulferien betreffen nur Matten Pilates, '
          + 'Reformer-Lektionen finden statt.',
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
