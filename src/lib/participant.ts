import 'server-only'
import type { DictionaryKey } from './i18n'
import { isYoungMember } from './abo'

/**
 * Rendering one participant in the instructor's view.
 *
 * The same thing is needed in two places: in the register on the
 * class's own page, and under the class in the calendar. Hence a shared
 * file — otherwise the two would drift apart over time and show
 * different things about the same person.
 */

export type Translate = (k: DictionaryKey, p?: Record<string, string | number>) => string

/**
 * What they are attending on: which pass, and how much is left on it.
 * Before a class this is the instructor's most frequent question, right
 * after the name.
 */
export const attendanceText = (b: any, t: Translate): string => {
  const abo = b?.abo
  if (!abo || typeof abo !== 'object') return '—'
  const name = abo.aboType?.name ?? t('common.class')
  const left = abo.creditsRemaining
  if (typeof left !== 'number') return name
  return left === 0
    ? t('lesson.pass_last', { name })
    : t('lesson.pass_remaining', { name, count: left })
}

/**
 * Rate markers next to the name. Young Member comes from the birth
 * year, not from a separate flag — that way it cannot go stale on its
 * own.
 */
export const tariffTags = (customer: any, t: Translate): string[] => {
  const out: string[] = []
  if (customer?.isMatCustomer) out.push(t('lesson.tag_mat'))
  if (isYoungMember(customer?.birthYear)) out.push(t('lesson.tag_young'))
  return out
}

/** One participant's row in the calendar. */
export type Participant = {
  id: number
  name: string
  reformer?: string
  abo?: string
  tags: string[]
  health?: string
  /** Only when it is not simply "gebucht". */
  status?: string
  /** The customer's profile. Without one, the name is not a link. */
  href?: string
}
