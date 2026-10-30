import type { Metadata } from 'next'
import config from '@payload-config'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * Payload's views expect search params without `undefined`, while Next
 * 16 allows `undefined` too. The value is the same, only the type is
 * stricter — so we narrow it in one place, shared between the two
 * admin pages, rather than at every call site.
 */
type PayloadSearchParams = Promise<{ [key: string]: string | string[] }>
const narrow = (sp: Args['searchParams']) => sp as PayloadSearchParams

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams: narrow(searchParams) })

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config, params, searchParams: narrow(searchParams), importMap })

export default NotFound
