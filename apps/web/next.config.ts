import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@harbor/contracts'],
  reactStrictMode: true,
};

export default nextConfig;
