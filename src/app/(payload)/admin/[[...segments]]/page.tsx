import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * A Payload nézetei `undefined` nélküli keresőparamétert várnak, a Next 16
 * viszont `undefined`-ot is megenged. Az érték ugyanaz, csak a típus
 * szigorúbb — ezért egy helyen szűkítjük, a két admin-oldal között
 * megosztva, és nem minden hívásnál külön.
 */
type PayloadSearchParams = Promise<{ [key: string]: string | string[] }>
const narrow = (sp: Args['searchParams']) => sp as PayloadSearchParams

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams: narrow(searchParams) })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams: narrow(searchParams), importMap })

export default Page
