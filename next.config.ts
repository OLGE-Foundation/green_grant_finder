import type { NextConfig } from "next";

// Security headers applied to every response. The Content-Security-Policy is
// intentionally limited to clickjacking / object / base-uri controls so it does
// not interfere with Next.js' inline bootstrap or Tailwind's inline styles.
// `frame-ancestors` allows same-origin framing only — if you embed the app in a
// cross-origin WordPress iframe, add that origin here (e.g. `https://yoursite.com`).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
