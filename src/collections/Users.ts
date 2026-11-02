import type { CollectionConfig } from 'payload'

/**
 * Everyone who signs in: customer, instructor, admin.
 * The role decides what they see and what they may edit.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // password sign-in plus email-link sign-in (a magic link based on a
    // token generated on the sign-in page)
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days
    verify: false,
  },
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'email', 'role'],
    group: 'Personen',
  },
  access: {
    // an admin sees everything, everyone else only themselves
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
        // The display name. A stored field rather than a computed one,
        // because Payload's relationship pickers and lists read it —
        // so names show up everywhere instead of email addresses.
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
        // only an admin may write the role, else anyone could promote themselves
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
       * Health note: an injury, an operation, a pregnancy, anything the
       * instructor needs to know before the class. Sensitive data, so
       * it is restricted at field level: customers see their own, and
       * beyond them only instructors and admins. It is kept out of the
       * list view.
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
      /*
       * Which language they teach in. This belongs to the instructor,
       * because in practice it decides who leads a class: Elin teaches
       * in English, Nadine, Jana and Aline in both German and English.
       * Individual classes may differ — see `sessions.languages`.
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
