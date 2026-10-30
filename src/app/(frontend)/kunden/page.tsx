import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/lib/auth'
import { customerList } from '@/lib/customer'
import { getLang } from '@/lib/lang'
import { translator } from '@/lib/i18n'
import { logout } from '../login/actions'

export const dynamic = 'force-dynamic'

type Search = Promise<{ q?: string }>

/**
 * The customer list. A way into the profiles and nothing more: beside
 * the search box it shows only what is needed to find a name.
 *
 * Instructors see it too, not only the admin — the same reasoning as
 * for the studio calendar: four of them teach and they cover for each
 * other, and whoever steps in also needs to reach the customer.
 */
export default async function Customers({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/kunden')
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/konto')

  const lang = await getLang(user)
  const t = translator(lang)
  const payload = await getPayload({ config })

  const list = await customerList(payload, q)

  return (
    <main className="shell wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('customer.eyebrow')}</p>
          <h1>{t('customer.list_title')}</h1>
        </div>
        <div className="who">
          <Link href="/unterricht">{t('common.teaching')}</Link>
          <span aria-hidden="true"> · </span>
          <form action={logout} style={{ display: 'inline' }}>
            <button type="submit" className="linkish">{t('common.sign_out_lower')}</button>
          </form>
        </div>
      </header>

      <p className="lead">{t('customer.list_lead')}</p>

      <form className="search" action="/kunden" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('customer.search_placeholder')}
          aria-label={t('customer.search_placeholder')}
        />
        <button className="btn ghost" type="submit">{t('customer.search_button')}</button>
        {q && <Link href="/kunden" className="linkish">{t('customer.search_clear')}</Link>}
      </form>

      {list.length === 0 ? (
        <p className="empty">{q ? t('customer.no_match') : t('customer.nobody')}</p>
      ) : (
        <>
          <p className="hint">
            {list.length === 1 ? t('customer.count_one') : t('customer.count', { count: list.length })}
          </p>
          <div className="table-frame">
            <table className="list">
              <thead>
                <tr>
                  <th>{t('customer.col_name')}</th>
                  <th>{t('customer.col_contact')}</th>
                  <th>{t('customer.col_notes')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((k) => (
                  <tr key={k.id}>
                    <td><Link href={`/kunden/${k.id}`}>{k.name}</Link></td>
                    <td>
                      <a href={`mailto:${k.email}`}>{k.email}</a>
                      {k.phone && <><br /><a href={`tel:${k.phone}`}>{k.phone}</a></>}
                    </td>
                    <td>
                      {/* The note's content is only visible on the profile. */}
                      {k.health && (
                        <span className="tag health">{t('customer.has_health_note')}</span>
                      )}
                      {k.matCustomer && <span className="tag">{t('lesson.tag_mat')}</span>}
                      {k.youngMember && <span className="tag">{t('lesson.tag_young')}</span>}
                      {!k.health && !k.matCustomer && !k.youngMember && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
