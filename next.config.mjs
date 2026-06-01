/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression for faster response times
  compress: true,

  // Enable React strict mode for development
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security

  async redirects() {
    return [
      {
        source: "/challenges",
        destination: "/events",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
