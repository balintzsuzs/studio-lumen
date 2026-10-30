import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A Payload admin futásidőben renderel, ezért a kísérleti
  // cacheComponents itt nincs bekapcsolva.
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
