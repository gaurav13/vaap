/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
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
