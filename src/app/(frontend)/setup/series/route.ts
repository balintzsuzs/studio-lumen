import { getPayload } from 'payload'
import config from '@payload-config'
import { generateSessions } from '@/lib/series'

/**
 * Generates the classes of an existing series:
 *
 *   curl -X POST "http://localhost:3000/setup/series?id=1"
 */
export async function POST(request: Request) {
  if (process.env.ALLOW_SEED !== 'true') {
    return Response.json({ error: 'deaktiviert' }, { status: 403 })
  }
  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!id) return Response.json({ error: 'id fehlt' }, { status: 400 })
  try {
    const payload = await getPayload({ config })
    return Response.json({ ok: true, ...(await generateSessions(payload, id)) })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
