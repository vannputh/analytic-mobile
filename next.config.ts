import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Enable compression for smaller responses
  compress: true,

  // Optimize package imports for better tree-shaking
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      'date-fns',
    ],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
    // Optimized image formats and caching
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), interest-cohort=()",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/entries",
        destination: "/movies",
        permanent: true,
      },
      {
        source: "/library",
        destination: "/movies",
        permanent: true,
      },
      {
        source: "/watching",
        destination: "/movies/watching",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
