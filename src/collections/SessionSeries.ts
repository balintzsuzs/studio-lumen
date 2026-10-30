import type { CollectionConfig } from 'payload'

/**
 * Ismétlődő óra ("minden hétfő 09:00").
 *
 * A sorozat csak a szabály — a konkrét órák továbbra is a `sessions`
 * rekordok, mert azokhoz kötődnek a foglalások. A sorozat mentése
 * legenerálja a hiányzó órákat az időszakra; egy már legenerált óra
 * egyedi szerkesztése "leszakítja" a sorozatról (`detached`), így a
 * későbbi sorozat-szintű módosítás nem írja vissza.
 */
export const SessionSeries: CollectionConfig = {
  slug: 'session-series',
  labels: { singular: 'Serie', plural: 'Serien' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'weekday', 'timeOfDay', 'studio', 'instructor', 'status'],
    group: 'Stundenplan',
    description:
      'Wiederkehrende Lektionen. Nach dem Speichern werden die einzelnen Lektionen für den Zeitraum erzeugt.',
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
      label: 'Bezeichnung',
      admin: { description: 'Nur zur Übersicht, z. B. «Montag 09:00 Zürich».' },
    },
    { name: 'classType', type: 'relationship', relationTo: 'class-types', required: true },
    { name: 'studio', type: 'relationship', relationTo: 'studios', required: true },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: () => ({ role: { in: ['instructor', 'admin'] } }),
    },
    {
      name: 'weekday',
      type: 'select',
      label: 'Wochentag',
      required: true,
      options: [
        { label: 'Montag', value: '1' },
        { label: 'Dienstag', value: '2' },
        { label: 'Mittwoch', value: '3' },
        { label: 'Donnerstag', value: '4' },
        { label: 'Freitag', value: '5' },
        { label: 'Samstag', value: '6' },
        { label: 'Sonntag', value: '0' },
      ],
    },
    {
      name: 'timeOfDay',
      type: 'text',
      label: 'Beginn (HH:MM)',
      required: true,
      admin: { description: 'Ortszeit Schweiz. Die Sommerzeit wird automatisch berücksichtigt.' },
      validate: (val: unknown) =>
        typeof val === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(val)
          ? true
          : 'Bitte im Format HH:MM angeben, z. B. 09:00.',
    },
    { name: 'durationMinutes', type: 'number', label: 'Dauer in Minuten', required: true, defaultValue: 60 },
    { name: 'startsOn', type: 'date', label: 'Erste Lektion am', required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } } },
    { name: 'endsOn', type: 'date', label: 'Letzte Lektion am', required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Aktiv', value: 'active' },
        { label: 'Beendet', value: 'ended' },
      ],
    },
  ],
}
