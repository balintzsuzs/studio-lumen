import 'server-only'
import type { Payload } from 'payload'
import { dateTimeLabel } from './format'
import { forditó, type Fordito } from './i18n'
import { isLang, type Lang } from './lang'

/**
 * Értesítések. Minden levél itt készül, egy helyen.
 *
 * A levél nyelve a CÍMZETTÉ (`users.language`), nem azé, aki a műveletet
 * elindította: ha Nadine németül mond le egy órát, a Elin óráira járó
 * angol ügyfél akkor is angolul kapja az értesítést.
 *
 * A prototípusban nincs e-mail szolgáltató beállítva, ezért a Payload a
 * konzolra írja a levelet — a tartalmat viszont a `notifications`
 * gyűjteménybe is elmentjük, így az admin felületen visszakereshető, és
 * a tesztek is ellenőrizhetik. Élesítéskor csak egy adaptert kell a
 * `payload.config.ts`-be tenni (pl. `@payloadcms/email-resend`), a
 * hívások maradnak.
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

/** A címzett nyelve, alapértelmezés szerint német. */
const nyelve = (user: any): Lang => (isLang(user?.language) ? user.language : 'de')

const SITE = () => process.env.SITE_URL ?? 'http://localhost:3000'

/** Egy levél elküldése és naplózása. Hibát nem dob: a napló rögzíti. */
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
    // Adapter nélkül a Payload a konzolra ír: ez nem hiba, de nem is
    // kézbesítés — ezért külön állapot.
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

/** A megszólítástól az aláírásig — minden levél így épül fel. */
const level = (t: Fordito, user: any, torzs: string) =>
  `${greeting(t, user)}\n\n${torzs}${t('level.alairas')}`

/** Óra megnevezése levélbe: típus, stúdió, időpont. */
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

// ---------------------------------------------------------------- várólista

/** Felszabadult hely kiajánlása. */
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

/** Röviddel az óra előtt: a hely mindenki számára szabad. */
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

// ------------------------------------------------------- óramódosítás

export type SessionChange = {
  oldStartsAt?: string
  newStartsAt?: string
  oldInstructor?: string
  newInstructor?: string
  oldStudio?: string
  newStudio?: string
}

/**
 * Értesítés az óra módosításáról minden aktív foglalónak.
 * Csak akkor küld, ha van tényleges, az ügyfelet érintő változás.
 */
export const sessionChanged = async (
  payload: Payload,
  sessionId: number,
  change: SessionChange,
): Promise<{ notified: number }> => {
  // Van-e egyáltalán az ügyfelet érintő változás? A sorok szövege
  // címzettenként készül, mert a dátum és a címke is nyelvfüggő.
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

/** Értesítés az óra lemondásáról. A kredit visszaírásáról a hívó dönt. */
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

// ------------------------------------------------------------- abo

const MOD_KULCS = {
  on_site: 'level.mod_on_site',
  transfer: 'level.mod_transfer',
  voucher: 'level.mod_voucher',
  online: 'level.mod_online',
} as const

/**
 * Megrendelés visszaigazolása. A fizetési útmutató a Buchungsregeln
 * beállításból jön — nem írunk ide bankadatot, azt Nadine adja meg.
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

/** Az abo aktiválása: innentől lehet foglalni. */
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
      // Csak a nap kell, az óra nem: a lejárat napra pontos.
      ervenyes: dateTimeLabel(abo.expiresAt, lang).split(',').slice(0, 2).join(','),
      link: `${SITE()}/buchen`,
    })),
  })
  return { ok: r.ok }
}
