/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize production builds
  compress: true,
  
  // Enable React strict mode for development
  reactStrictMode: true,
  
  // Image optimization
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimized font loading
  fonts: {
    fontFamilies: [
      {
        name: 'system-ui',
        fonts: [
          { weight: '400', style: 'normal' },
        ],
      },
    ],
  },

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    generateEtags: true,
  }),
};

export default nextConfig;
