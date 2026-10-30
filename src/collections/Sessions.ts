import type { CollectionConfig } from 'payload'
import { propagateToFutureSessions } from '../lib/series'
import { notifyIfRelevantChange } from '../lib/session-notice'

/**
 * Egy konkrét megtartott óra: típus, oktató, stúdió, időpont.
 * A férőhely nincs külön tárolva: a stúdió aktív reformereinek
 * száma adja, így egy gép karbantartásba tétele automatikusan
 * csökkenti a kapacitást.
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
       * Az óra nyelve. Üresen hagyva az oktató nyelvei érvényesek —
       * így egy új oktató felvételekor nem kell 48 órát átírni.
       * Csak akkor töltsd ki, ha ez az egy óra eltér.
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
      // A lemondás oka külön mezőben, nem a `note`-ban: a hinweis Nadine
      // saját megjegyzése, azt egy automatikus lemondás nem írhatja felül.
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
      // A "csak ez / ez és az összes jövőbeli" választás. Mentés után
      // az afterChange hook ennek megfelelően terjeszti a változást.
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
        // Egyetlen alkalom szerkesztése leszakítja azt a sorozatról
        // (ugyanaz a konvenció, mint a Mariana Tek-nél).
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
        // A továbbterjesztés maga is update-eket indít — ne hívja magát újra.
        if (context?.skipSeriesPropagation) return
        if (!doc.series || doc.editScope !== 'this_and_future') return
        await propagateToFutureSessions(req.payload, doc, req)
      },
      // Értesítés az időpont, oktató vagy stúdió változásáról. A továbbterjesztés
      // nem állítja be a `skipChangeNotice`-t, így a sorozat többi órájának
      // foglalói is megkapják a levelet.
      async ({ doc, previousDoc, operation, req, context }) => {
        if (operation !== 'update') return
        if (context?.skipChangeNotice) return
        await notifyIfRelevantChange(req.payload, doc, previousDoc)
      },
    ],
  },
}
