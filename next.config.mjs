/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Served by `next start` (sharp) so the 1-2.5 MB source PNGs reach visitors
    // as right-sized AVIF/WebP. Admin-entered image URLs can point anywhere.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    qualities: [30, 60, 75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  poweredByHeader: false,
  // The social banner renderer loads this font from disk, so it must ship with the server bundles that render.
  outputFileTracingIncludes: {
    "/admin/social-agent": ["./lib/social-agent/fonts/**"],
    "/api/cron/email-automations": ["./lib/social-agent/fonts/**"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "9mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ]
  },
  async redirects() {
    return [
      { source: "/committees", destination: "/working-groups", permanent: true },
      { source: "/committees/:path*", destination: "/working-groups/:path*", permanent: true },
      { source: "/governance/voting", destination: "/voting", permanent: true },
      { source: "/governance/voting/:path*", destination: "/voting/:path*", permanent: true },
      { source: "/membership/kols", destination: "/membership/verified-opinion-leaders", permanent: true },
      { source: "/membership/kols/:slug", destination: "/membership/verified-opinion-leaders/:slug", permanent: true },
      { source: "/governance/framework", destination: "/governance", permanent: true },
      { source: "/resources", destination: "/knowledge", permanent: false },
      { source: "/sitemap", destination: "/sitemap.xml", permanent: false },
      { source: "/governance/register", destination: "/voting/results", permanent: true },
  { source: "/voting/register", destination: "/voting/results", permanent: true },
  ...["proposals", "verify", "elections"].flatMap((seg) => [
        { source: `/governance/${seg}`, destination: `/voting/${seg}`, permanent: true },
        { source: `/governance/${seg}/:path*`, destination: `/voting/${seg}/:path*`, permanent: true },
      ]),
    ]
  },
}

export default nextConfig
