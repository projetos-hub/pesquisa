import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Rotas da pesquisa — só podem ser embutidas via iFrame pela Layers
        source: '/p/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.layers.education https://layers.education",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM https://layers.education',
          },
        ],
      },
      {
        // Área admin — nunca pode ser embutida em iFrame
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
      {
        // API — nunca embutida, bloqueia iFrame e força HTTPS
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig;
