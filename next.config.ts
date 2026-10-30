import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The Payload admin renders at request time, so the experimental
  // cacheComponents flag is not enabled here.
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
