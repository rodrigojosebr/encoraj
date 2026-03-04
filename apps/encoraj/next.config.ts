import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@encoraj/ui'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.amazonaws.com' }] },
}

export default nextConfig
