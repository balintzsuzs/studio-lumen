import type { CollectionConfig } from 'payload'

/**
 * Minden belépő ember: ügyfél, oktató, admin.
 * A szerep dönti el, mit lát és mit szerkeszthet.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // jelszavas belépés + e-mail linkes belépés is (magic link a bejelentkezési
    // oldalon generált token alapján)
    tokenExpiration: 60 * 60 * 24 * 30, // 30 nap
    verify: false,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'role'],
    group: 'Personen',
  },
  access: {
    // admin mindent lát, mindenki más csak magát
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { id: { equals: user.id } }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // A megjelenítendő név. Azért tárolt mező és nem számított,
        // mert a Payload kapcsolat-választói és listái ezt kérik le —
        // e-mail-cím helyett így a nevek látszanak mindenhol.
        const full = [data?.firstName, data?.lastName].filter(Boolean).join(' ').trim()
        if (full) data.fullName = full
        return data
      },
    ],
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'Name',
      admin: { readOnly: true, hidden: true },
    },
    { name: 'firstName', type: 'text', label: 'Vorname', required: true },
    { name: 'lastName', type: 'text', label: 'Nachname', required: true },
    { name: 'phone', type: 'text', label: 'Telefon' },
    {
      name: 'role',
      type: 'select',
      label: 'Rolle',
      required: true,
      defaultValue: 'customer',
      options: [
        { label: 'Kundin / Kunde', value: 'customer' },
        { label: 'Trainer:in', value: 'instructor' },
        { label: 'Administration', value: 'admin' },
      ],
      access: {
        // a szerepet csak admin írhatja, különben bárki adminná tenné magát
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'birthYear',
      type: 'number',
      label: 'Jahrgang',
      admin: {
        description: 'Für den Young-Member-Tarif, 16 bis 24 Jahre.',
      },
    },
    {
      /*
       * Egészségügyi megjegyzés: sérülés, műtét, terhesség, bármi, amit az
       * oktatónak tudnia kell óra előtt. Érzékeny adat, ezért mezőszinten
       * korlátozott: az ügyfél a sajátját látja, rajta kívül csak az
       * oktatók és az admin. A lista-nézetből kimarad.
       */
      name: 'healthNotes',
      type: 'textarea',
      label: 'Gesundheitliche Hinweise',
      admin: {
        description:
          'Verletzungen, Operationen, Schwangerschaft — was die Trainerin vor der Lektion wissen muss. Erscheint in der Teilnehmerinnenliste.',
      },
      access: {
        read: ({ req: { user }, doc }) =>
          user?.role === 'admin' ||
          user?.role === 'instructor' ||
          user?.id === (doc as { id?: number } | undefined)?.id,
        update: ({ req: { user } }) =>
          user?.role === 'admin' || user?.role === 'instructor',
      },
    },
    {
      name: 'isMatCustomer',
      type: 'checkbox',
      label: 'Besucht Matten-Pilates',
      defaultValue: false,
      admin: {
        description: 'Berechtigt zusammen mit Young Member zum Spezialtarif.',
      },
    },
    {
      /*
       * Milyen nyelven tartja az órát. Ez az oktató tulajdonsága, mert a
       * gyakorlatban az dönti el, ki vezeti az órát: Elin angolul,
       * Nadine, Jana és Aline németül és angolul is. Az egyes órák
       * ettől eltérhetnek, lásd a `sessions.languages` mezőt.
       */
      name: 'teachingLanguages',
      type: 'select',
      hasMany: true,
      label: 'Unterrichtssprachen',
      options: [
        { label: 'Deutsch', value: 'de' },
        { label: 'English', value: 'en' },
      ],
      admin: {
        description: 'Nur für Trainerinnen. Gilt für alle Lektionen dieser Person.',
        condition: (data) => data?.role === 'instructor' || data?.role === 'admin',
      },
    },
    {
      name: 'language',
      type: 'select',
      label: 'Sprache',
      defaultValue: 'de',
      options: [
        { label: 'Deutsch', value: 'de' },
        { label: 'English', value: 'en' },
      ],
    },
  ],
}
