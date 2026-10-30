import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Demo profiles for the register: so the instructor view shows all
 * three cases — a mat-Pilates customer, a Young Member, and a health
 * note.
 *
 * INVENTED data, on demo accounts. Never put a real customer's health
 * data in here.
 *
 *   curl -X POST http://localhost:3000/setup/demo-profiles
 */
const PROFILES: Record<string, { isMatCustomer?: boolean; birthYear?: number; healthNotes?: string }> = {
  'gast1@demo.studio-lumen.ch': { isMatCustomer: true },
  'gast2@demo.studio-lumen.ch': { birthYear: new Date().getFullYear() - 21 },
  'gast3@demo.studio-lumen.ch': {
    healthNotes: 'Bandscheibenvorfall L4/L5, keine tiefe Flexion. Seit Juni beschwerdefrei.',
  },
  'gast4@demo.studio-lumen.ch': {
    isMatCustomer: true,
    birthYear: new Date().getFullYear() - 23,
    healthNotes: 'Schulter rechts nach OP, bitte kein Zug über Kopfhöhe.',
  },
}

export async function POST() {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  try {
    const payload = await getPayload({ config })
    const done: string[] = []
    for (const [email, data] of Object.entries(PROFILES)) {
      const match = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      const user = (match.docs as any[])[0]
      if (!user) continue
      await payload.update({ collection: 'users', id: user.id, data: data })
      done.push(`${user.firstName}: ${Object.keys(data).join(', ')}`)
    }
    return Response.json({ ok: true, configured: done })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
