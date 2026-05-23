import type { NextConfig } from "next";

const isExport = process.env.NEXT_PUBLIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  output: isExport ? 'export' : undefined,
  trailingSlash: isExport ? true : undefined,
  images: {
    unoptimized: isExport ? true : undefined,
  },
  // @ts-ignore
  allowedDevOrigins: ['192.168.16.211', '192.168.201.211', '10.195.245.211', '192.168.45.211', 'capitol-sufficiently-strings-carry.trycloudflare.com'],
  async rewrites() {
    if (isExport) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*', // Proxy to Backend
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:5000/uploads/:path*', // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
