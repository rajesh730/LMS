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

  // Baseline security headers applied to every response. (A full CSP is left
  // out deliberately — it needs per-app tuning and can break inline scripts,
  // EventSource, and external images.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Conservative CSP: locks down base-uri/object/frame-ancestors (the
            // high-value, low-breakage directives) while leaving script/style
            // permissive because Next.js relies on inline runtime scripts.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "connect-src 'self' https: wss:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
