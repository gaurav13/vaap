/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/governance/voting", destination: "/voting", permanent: true },
      { source: "/governance/voting/:path*", destination: "/voting/:path*", permanent: true },
      { source: "/governance/framework", destination: "/governance", permanent: true },
      ...["proposals", "register", "verify", "elections"].flatMap((seg) => [
        { source: `/governance/${seg}`, destination: `/voting/${seg}`, permanent: true },
        { source: `/governance/${seg}/:path*`, destination: `/voting/${seg}/:path*`, permanent: true },
      ]),
    ]
  },
}

export default nextConfig
