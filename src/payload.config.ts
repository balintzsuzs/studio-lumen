import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Studios } from './collections/Studios'
import { Reformers } from './collections/Reformers'
import { ClassTypes } from './collections/ClassTypes'
import { Sessions } from './collections/Sessions'
import { SessionSeries } from './collections/SessionSeries'
import { Bookings } from './collections/Bookings'
import { AboTypes } from './collections/AboTypes'
import { Abos } from './collections/Abos'
import { WaitlistEntries } from './collections/WaitlistEntries'
import { ClosurePeriods } from './collections/ClosurePeriods'
import { Notifications } from './collections/Notifications'
import { ContactMessages } from './collections/ContactMessages'
import { BookingSettings } from './globals/BookingSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * The database is determined from the connection string.
 *
 * An SQLite file locally, Postgres on Vercel (Neon or Supabase). That
 * way deploying needs no code change, only `DATABASE_URI` — and the
 * prototype still runs without any external account.
 */
const databaseUri = process.env.DATABASE_URI || 'file:./studio-lumen.db'
const isPostgres = /^postgres(ql)?:\/\//.test(databaseUri)

const db = isPostgres
  ? postgresAdapter({ pool: { connectionString: databaseUri } })
  : sqliteAdapter({ client: { url: databaseUri } })

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · Studio Lumen',
    },
  },
  collections: [
    Users,
    Studios,
    Reformers,
    ClassTypes,
    SessionSeries,
    Sessions,
    ClosurePeriods,
    Bookings,
    AboTypes,
    Abos,
    WaitlistEntries,
    Notifications,
    ContactMessages,
    Media,
  ],
  globals: [BookingSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  // The admin UI language: German by default, English selectable.
  i18n: {
    fallbackLanguage: 'de',
    supportedLanguages: { de, en },
  },
})
