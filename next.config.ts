import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.devtunnels.ms'
      ],
    },
  },
  // Better SVG support
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;