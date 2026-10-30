import type { CollectionConfig } from 'payload'

/** Class type: Reformer Flow, Matten Gruppe, Pilates Care and so on. */
export const ClassTypes: CollectionConfig = {
  slug: 'class-types',
  labels: { singular: 'Kursart', plural: 'Kursarten' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'creditCost', 'defaultDuration'],
    group: 'Stundenplan',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea', label: 'Beschreibung' },
    {
      name: 'creditCost',
      type: 'number',
      label: 'Guthaben pro Lektion',
      required: true,
      defaultValue: 1,
    },
    {
      name: 'defaultDuration',
      type: 'number',
      label: 'Dauer in Minuten',
      required: true,
      defaultValue: 60,
    },
    {
      name: 'usesReformers',
      type: 'checkbox',
      label: 'Findet auf Reformern statt',
      defaultValue: true,
      admin: { description: 'Nur dann kann ein Gerät gewählt werden.' },
    },
  ],
}
