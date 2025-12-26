import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/playground',
        destination: '/builder',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
