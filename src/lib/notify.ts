import 'server-only'
import type { Payload } from 'payload'
import { dateTimeLabel } from './format'
import { forditó, type Fordito } from './i18n'
import { isLang, type Lang } from './lang'

/**
 * Notifications. Every email is composed here, in one place.
 *
 * An email is in the RECIPIENT's language (`users.language`), not that
 * of whoever triggered the action: if the owner cancels a class in
 * German, an English-speaking customer still gets the notice in
 * English.
 *
 * No email provider is configured in this prototype, so Payload writes
 * the message to the console — but the content is also saved to the
 * `notifications` collection, which makes it searchable in the admin
 * and checkable by the tests. Going live only means adding an adapter
 * to `payload.config.ts` (`@payloadcms/email-resend`, say); the call
 * sites stay as they are.
 */

export type NotificationType =
  | 'abo_ordered'
  | 'abo_activated'
  | 'waitlist_offer'
  | 'waitlist_released'
  | 'session_changed'
  | 'session_cancelled'
  | 'booking_confirmed'

const idOf = (v: unknown): number =>
  typeof v === 'object' && v !== null ? (v as { id: number }).id : (v as number)

/** The recipient's language, German by default. */
const nyelve = (user: any): Lang => (isLang(user?.language) ? user.language : 'de')

const SITE = () => process.env.SITE_URL ?? 'http://localhost:3000'

/** Sends and logs one email. Never throws: the log records the outcome. */
export const send = async (
  payload: Payload,
  opts: {
    type: NotificationType
    userId: number
    subject: string
    body: string
    sessionId?: number
    bookingId?: number
  },
): Promise<{ ok: boolean; notificationId?: number }> => {
  let user: any = null
  try {
    user = await payload.findByID({ collection: 'users', id: opts.userId, depth: 0 })
  } catch {
    return { ok: false }
  }
  if (!user?.email) return { ok: false }

  let status: 'sent' | 'failed' | 'logged' = 'logged'
  let error: string | undefined

  try {
    await payload.sendEmail({ to: user.email, subject: opts.subject, text: opts.body })
    // Without an adapter Payload writes to the console: that is not a
    // failure, but it is not delivery either — hence its own status.
    status = process.env.EMAIL_ADAPTER_READY === 'true' ? 'sent' : 'logged'
  } catch (e) {
    status = 'failed'
    error = String(e).slice(0, 200)
  }

  const record = await payload.create({
    collection: 'notifications',
    data: {
      type: opts.type,
      recipient: opts.userId,
      recipientEmail: user.email,
      subject: opts.subject,
      body: opts.body,
      session: opts.sessionId ?? null,
      booking: opts.bookingId ?? null,
      sentAt: new Date().toISOString(),
      status,
      error: error ?? null,
    },
  })

  return { ok: status !== 'failed', notificationId: record.id as number }
}

const greeting = (t: Fordito, user: any) =>
  t('level.megszolitas', { nev: user?.firstName ?? t('level.megszolitas_altalanos') })

/** From the greeting to the sign-off — every email is built this way. */
const level = (t: Fordito, user: any, torzs: string) =>
  `${greeting(t, user)}\n\n${torzs}${t('level.alairas')}`

/** Naming a class in an email: type, studio, time. */
const describe = async (
  payload: Payload,
  sessionId: number,
  t: Fordito,
  lang: Lang,
): Promise<string> => {
  const s: any = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 1 })
  const type = s.classType?.name ?? t('level.ora_szo')
  const studio = s.studio?.city ?? s.studio?.name ?? ''
  const hol = studio ? t('level.helyszin_kozott', { varos: studio }) : ''
  return `${type}${hol}, ${dateTimeLabel(s.startsAt, lang)}`
}

// ---------------------------------------------------------------- waitlist

/** Offering a freed-up spot. */
export const waitlistOffer = async (
  payload: Payload,
  userId: number,
  sessionId: number,
  expiresAt: Date,
) => {
  const user: any = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const lang = nyelve(user)
  const t = forditó(lang)
  const what = await describe(payload, sessionId, t, lang)
  return send(payload, {
    type: 'waitlist_offer',
    userId,
    sessionId,
    subject: t('level.ajanlat_targy'),
    body: level(t, user, t('level.ajanlat_torzs', {
      mi: what,
      hatarido: dateTimeLabel(expiresAt.toISOString(), lang),
      link: `${SITE()}/buchen/${sessionId}`,
    })),
  })
}

/** Shortly before the class: the spot is open to everyone. */
export const waitlistReleased = async (payload: Payload, userId: number, sessionId: number) => {
  const user: any = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const lang = nyelve(user)
  const t = forditó(lang)
  const what = await describe(payload, sessionId, t, lang)
  return send(payload, {
    type: 'waitlist_released',
    userId,
    sessionId,
    subject: t('level.felszabadult_targy'),
    body: level(t, user, t('level.felszabadult_torzs', {
      mi: what,
      link: `${SITE()}/buchen/${sessionId}`,
    })),
  })
}

// ------------------------------------------------------- class changes

export type SessionChange = {
  oldStartsAt?: string
  newStartsAt?: string
  oldInstructor?: string
  newInstructor?: string
  oldStudio?: string
  newStudio?: string
}

/**
 * Notifies everyone with an active booking that the class has changed.
 * Only sends when there is a real change that concerns the customer.
 */
export const sessionChanged = async (
  payload: Payload,
  sessionId: number,
  change: SessionChange,
): Promise<{ notified: number }> => {
  // Is there any change that concerns the customer at all? The lines
  // are composed per recipient, because both the date and the labels
  // depend on the language.
  const idoValtozott = Boolean(
    change.oldStartsAt && change.newStartsAt && change.oldStartsAt !== change.newStartsAt)
  const oktatoValtozott = Boolean(
    change.oldInstructor && change.newInstructor && change.oldInstructor !== change.newInstructor)
  const helyValtozott = Boolean(
    change.oldStudio && change.newStudio && change.oldStudio !== change.newStudio)
  if (!idoValtozott && !oktatoValtozott && !helyValtozott) return { notified: 0 }

  const sorok = (t: Fordito, lang: Lang) => {
    const ki: string[] = []
    if (idoValtozott)
      ki.push(`  ${t('level.modositas_ido')}${dateTimeLabel(change.oldStartsAt!, lang)}\n              → ${dateTimeLabel(change.newStartsAt!, lang)}`)
    if (oktatoValtozott)
      ki.push(`  ${t('level.modositas_oktato')}${change.oldInstructor} → ${change.newInstructor}`)
    if (helyValtozott)
      ki.push(`  ${t('level.modositas_hely')}${change.oldStudio} → ${change.newStudio}`)
    return ki.join('\n')
  }

  const bookings = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'booked' } }] },
    limit: 200, depth: 0,
  })

  let notified = 0
  for (const b of bookings.docs as any[]) {
    const user: any = await payload.findByID({ collection: 'users', id: idOf(b.customer), depth: 0 })
    const lang = nyelve(user)
    const t = forditó(lang)
    const r = await send(payload, {
      type: 'session_changed',
      userId: idOf(b.customer),
      sessionId,
      bookingId: b.id,
      subject: t('level.modositas_targy'),
      body: level(t, user, t('level.modositas_torzs', {
        sorok: sorok(t, lang),
        link: `${SITE()}/konto`,
      })),
    })
    if (r.ok) notified++
  }
  return { notified }
}

/** Notifies that the class was cancelled. Refunding the credit is the caller's call. */
export const sessionCancelled = async (
  payload: Payload,
  sessionId: number,
  reason: string,
  refunded: boolean,
): Promise<{ notified: number }> => {
  const bookings = await payload.find({
    collection: 'bookings',
    where: { and: [{ session: { equals: sessionId } }, { status: { equals: 'cancelled' } }] },
    limit: 200, depth: 0,
  })

  let notified = 0
  for (const b of bookings.docs as any[]) {
    const user: any = await payload.findByID({ collection: 'users', id: idOf(b.customer), depth: 0 })
    const lang = nyelve(user)
    const t = forditó(lang)
    const what = await describe(payload, sessionId, t, lang)
    const r = await send(payload, {
      type: 'session_cancelled',
      userId: idOf(b.customer),
      sessionId,
      bookingId: b.id,
      subject: t('level.lemondas_targy'),
      body: level(t, user, t('level.lemondas_torzs', {
        mi: what,
        indok: reason,
        guthaben: refunded
          ? t('level.lemondas_visszairva')
          : t('level.lemondas_nem_valtozott'),
        link: `${SITE()}/buchen`,
      })),
    })
    if (r.ok) notified++
  }
  return { notified }
}

// ------------------------------------------------------------- passes

const MOD_KULCS = {
  on_site: 'level.mod_on_site',
  transfer: 'level.mod_transfer',
  voucher: 'level.mod_voucher',
  online: 'level.mod_online',
} as const

/**
 * Order confirmation. The payment instructions come from the
 * Buchungsregeln setting — no bank details are written here, the studio
 * fills those in.
 */
export const aboOrdered = async (
  payload: Payload,
  userId: number,
  aboId: number,
): Promise<{ ok: boolean }> => {
  const user: any = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 1 })
  const settings = await payload.findGlobal({ slug: 'booking-settings' })
  const instructions = (settings?.paymentInstructions as string | undefined) ?? ''
  const t = forditó(nyelve(user))
  const modKulcs = MOD_KULCS[abo.paymentMethod as keyof typeof MOD_KULCS]

  const r = await send(payload, {
    type: 'abo_ordered',
    userId,
    subject: t('level.rendeles_targy'),
    body: level(t, user, t('level.rendeles_torzs', {
      abo: abo.aboType?.name ?? '',
      db: abo.aboType?.credits ?? 0,
      ar: abo.aboType?.priceChf ?? 0,
      mod: modKulcs ? t(modKulcs) : '',
      utmutato: instructions,
    })),
  })
  return { ok: r.ok }
}

/** Activating the pass: booking is possible from here on. */
export const aboActivated = async (
  payload: Payload,
  userId: number,
  aboId: number,
): Promise<{ ok: boolean }> => {
  const user: any = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const abo: any = await payload.findByID({ collection: 'abos', id: aboId, depth: 1 })
  const lang = nyelve(user)
  const t = forditó(lang)

  const r = await send(payload, {
    type: 'abo_activated',
    userId,
    subject: t('level.aktivalas_targy'),
    body: level(t, user, t('level.aktivalas_torzs', {
      abo: abo.aboType?.name ?? '',
      db: abo.creditsRemaining ?? 0,
      // Only the day is needed, not the time: expiry is day-precise.
      ervenyes: dateTimeLabel(abo.expiresAt, lang).split(',').slice(0, 2).join(','),
      link: `${SITE()}/buchen`,
    })),
  })
  return { ok: r.ok }
}
