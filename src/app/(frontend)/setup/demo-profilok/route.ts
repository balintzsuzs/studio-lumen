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
 *   curl -X POST http://localhost:3000/setup/demo-profilok
 */
const PROFILOK: Record<string, { isMatCustomer?: boolean; birthYear?: number; healthNotes?: string }> = {
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
    const kesz: string[] = []
    for (const [email, adat] of Object.entries(PROFILOK)) {
      const talalat = await payload.find({
        collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0,
      })
      const user = (talalat.docs as any[])[0]
      if (!user) continue
      await payload.update({ collection: 'users', id: user.id, data: adat })
      kesz.push(`${user.firstName}: ${Object.keys(adat).join(', ')}`)
    }
    return Response.json({ ok: true, beallitva: kesz })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
