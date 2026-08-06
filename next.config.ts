import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma generates the client to src/generated/prisma (custom output); ensure
  // the native Query Engine binaries (libquery_engine-*.so.node) are shipped in
  // the traced deployment bundle, or production crashes with engine-not-found.
  outputFileTracingIncludes: {
    '/*': ['./src/generated/prisma/**/*'],
  },
  serverExternalPackages: ["bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.googletagmanager.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.ingest.sentry.io https://api.uploadthing.com https://va.vercel-scripts.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              "media-src 'self' https:",
              "manifest-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      // NOTE: no custom Cache-Control for /_next/static/*. Next.js already
      // emits `public, max-age=31536000, immutable` for fingerprinted
      // assets in production builds. Overriding it (as this file did before)
      // breaks the dev server: the browser treats dev chunks as immutable,
      // serves stale JS and the Turbopack dev client reloads the page in an
      // infinite loop (Next prints a warning about this).
      //
      // Cache images and fonts for 1 month
      {
        source: "/:path*.(svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|eot)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
      // Cache manifest and service worker (revalidate daily)
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      // No cache for HTML pages
      {
        source: "/:path(.+\.html)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
