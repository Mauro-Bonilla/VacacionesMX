import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    serverActions: {
      // Allow server actions to work in development tunnels and proxies
      allowedOrigins: [
        'localhost:3000',
        // Add your specific domain if you know it
        // e.g. '*.devtunnels.ms', 'your-app.your-domain.com'
        // Or use a wildcard to allow any origin (less secure)
        '*'
      ],
    },
  },
};

export default nextConfig;
