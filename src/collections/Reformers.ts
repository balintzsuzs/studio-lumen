import type { CollectionConfig } from 'payload'

/**
 * Egy konkrét gép egy teremben. A `row` és `column` adja a helyét a
 * teremtérképen, az `status` pedig kiveheti a foglalható körből
 * (pl. karbantartás) anélkül, hogy a múltbeli foglalásokat elrontaná.
 */
export const Reformers: CollectionConfig = {
  slug: 'reformers',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'studio', 'row', 'column', 'status'],
    group: 'Studio',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: { description: 'Was die Kundin sieht, zum Beispiel "Reformer 1".' },
    },
    { name: 'studio', type: 'relationship', relationTo: 'studios', required: true },
    {
      name: 'row',
      type: 'number',
      label: 'Reihe',
      required: true,
      admin: { description: 'Reihe 1 = direkt vor dem Spiegel.' },
    },
    { name: 'column', type: 'number', label: 'Position in der Reihe', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Verfügbar', value: 'active' },
        { label: 'Wartung', value: 'maintenance' },
        { label: 'Ausser Betrieb', value: 'retired' },
      ],
    },
    { name: 'note', type: 'text', label: 'Notiz' },
  ],
}
