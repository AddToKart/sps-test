/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true,
  },
  // Add this to debug routing issues
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'firebase/auth': require.resolve('firebase/auth'),
      'firebase/app': require.resolve('firebase/app'),
      'firebase/firestore': require.resolve('firebase/firestore'),
    };
    return config;
  },
}

module.exports = nextConfig 