import 'server-only'
import type { Payload } from 'payload'
import { sessionChanged } from './notify'

/**
 * Notifies the people booked after a class is changed — but only when
 * the change concerns them: time, instructor or studio. Editing the
 * duration, the note or an internal field is not worth an email.
 *
 * It lives in its own file so that the `sessions` collection does not
 * import the whole notification layer circularly.
 */

const idOf = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined
  return typeof v === 'object' ? (v as { id: number }).id : (v as number)
}

const nameOf = async (payload: Payload, collection: 'users' | 'studios', id?: number) => {
  if (!id) return undefined
  try {
    const d: any = await payload.findByID({ collection, id, depth: 0 })
    if (collection === 'users') return [d.firstName, d.lastName].filter(Boolean).join(' ')
    return d.city ?? d.name
  } catch {
    return undefined
  }
}

export const notifyIfRelevantChange = async (
  payload: Payload,
  doc: any,
  previousDoc: any,
): Promise<{ notified: number }> => {
  if (!previousDoc) return { notified: 0 }

  const timeMoved = doc.startsAt !== previousDoc.startsAt
  const instructorChanged = idOf(doc.instructor) !== idOf(previousDoc.instructor)
  const studioChanged = idOf(doc.studio) !== idOf(previousDoc.studio)
  if (!timeMoved && !instructorChanged && !studioChanged) return { notified: 0 }

  // A cancelled class was not "changed" — the cancellation notifies about that.
  if (doc.status === 'cancelled') return { notified: 0 }

  return sessionChanged(payload, doc.id, {
    oldStartsAt: timeMoved ? previousDoc.startsAt : undefined,
    newStartsAt: timeMoved ? doc.startsAt : undefined,
    oldInstructor: instructorChanged
      ? await nameOf(payload, 'users', idOf(previousDoc.instructor)) : undefined,
    newInstructor: instructorChanged
      ? await nameOf(payload, 'users', idOf(doc.instructor)) : undefined,
    oldStudio: studioChanged
      ? await nameOf(payload, 'studios', idOf(previousDoc.studio)) : undefined,
    newStudio: studioChanged
      ? await nameOf(payload, 'studios', idOf(doc.studio)) : undefined,
  })
}
