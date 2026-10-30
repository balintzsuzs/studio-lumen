import type { CollectionConfig } from 'payload'
import { propagateToFutureSessions } from '../lib/series'
import { notifyIfRelevantChange } from '../lib/session-notice'

/**
 * One actual class: type, instructor, studio, time.
 * Capacity is not stored separately: it is the number of active
 * reformers in the studio, so putting a machine into maintenance
 * reduces capacity automatically.
 */
export const Sessions: CollectionConfig = {
  slug: 'sessions',
  labels: { singular: 'Lektion', plural: 'Lektionen' },
  admin: {
    useAsTitle: 'startsAt',
    defaultColumns: ['startsAt', 'classType', 'studio', 'instructor', 'status'],
    group: 'Stundenplan',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'classType', type: 'relationship', relationTo: 'class-types', required: true },
    { name: 'studio', type: 'relationship', relationTo: 'studios', required: true },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      filterOptions: () => ({ role: { in: ['instructor', 'admin'] } }),
    },
    { name: 'startsAt', type: 'date', label: 'Beginn', required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'durationMinutes', type: 'number', label: 'Dauer in Minuten', required: true, defaultValue: 60 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      options: [
        { label: 'Geplant', value: 'scheduled' },
        { label: 'Abgesagt', value: 'cancelled' },
      ],
    },
    {
      /*
       * The language of the class. Left empty, the instructor's own
       * languages apply — so taking on a new instructor does not mean
       * editing 48 classes. Fill this in only when this one class
       * differs.
       */
      name: 'languages',
      type: 'select',
      hasMany: true,
      label: 'Sprache dieser Lektion',
      options: [
        { label: 'Deutsch', value: 'de' },
        { label: 'English', value: 'en' },
      ],
      admin: {
        description: 'Leer lassen: es gelten die Sprachen der Trainerin.',
      },
    },
    { name: 'note', type: 'text', label: 'Hinweis' },
    {
      // The cancellation reason gets its own field, not `note`: the
      // note is the studio's own remark, and an automatic cancellation
      // must not overwrite it.
      name: 'cancellationReason',
      type: 'text',
      label: 'Grund der Absage',
      admin: { condition: (data) => data?.status === 'cancelled' },
    },
    {
      name: 'series',
      type: 'relationship',
      relationTo: 'session-series',
      label: 'Teil der Serie',
      admin: { readOnly: true, description: 'Wird beim Erzeugen aus einer Serie gesetzt.' },
    },
    {
      name: 'detached',
      type: 'checkbox',
      label: 'Von der Serie gelöst',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Einzeln geänderte Lektionen werden gelöst — Änderungen an der Serie überschreiben sie nicht mehr.',
      },
    },
    {
      // The "this one only / this and all future" choice. After saving,
      // the afterChange hook propagates the change accordingly.
      name: 'editScope',
      type: 'select',
      label: 'Änderung gilt für',
      defaultValue: 'only_this',
      options: [
        { label: 'Nur diese Lektion', value: 'only_this' },
        { label: 'Diese und alle künftigen Lektionen der Serie', value: 'this_and_future' },
      ],
      admin: {
        description:
          'Nur relevant bei Lektionen aus einer Serie. «Nur diese Lektion» löst die Lektion von der Serie.',
        condition: (data) => Boolean(data?.series),
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation, context }) => {
        // Editing a single occurrence detaches it from the series
        // (the same convention Mariana Tek uses).
        if (
          operation === 'update' &&
          !context?.skipSeriesPropagation &&
          (data?.series ?? originalDoc?.series) &&
          data?.editScope === 'only_this'
        ) {
          data.detached = true
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, context }) => {
        if (operation !== 'update') return
        // Propagation itself triggers updates — it must not re-enter itself.
        if (context?.skipSeriesPropagation) return
        if (!doc.series || doc.editScope !== 'this_and_future') return
        await propagateToFutureSessions(req.payload, doc, req)
      },
      // Notifies about a change of time, instructor or studio.
      // Propagation does not set `skipChangeNotice`, so the people
      // booked into the series' other classes get the email too.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== 'update') return
        if (context?.skipChangeNotice) return
        await notifyIfRelevantChange(req.payload, doc, previousDoc)
      },
    ],
  },
}
