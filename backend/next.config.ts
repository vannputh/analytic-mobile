import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@analytics/contracts"],
  turbopack: {
    root: process.cwd()
  },
  compress: true,
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
      }
    ]
  }
}

export default nextConfig
