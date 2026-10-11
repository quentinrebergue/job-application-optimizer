import type { NextConfig } from "next";

// Headers that do not change from one request to the next (#205). The Content Security Policy does:
// it carries a nonce, so it is set in src/proxy.ts. HSTS is sent by the ingress (ingress-nginx adds
// it to every TLS host), so it is not repeated here: two values for one header are ambiguous.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Old browsers that do not know frame-ancestors of the CSP.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Nothing the app does needs the camera, the microphone, the position, payments or USB.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.102.117.86'],
  output: 'standalone',
  // Says nothing about the framework to whoever asks.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Raw school-project sources kept locally for AI analysis (see data/README.md)
  // aren't part of the app, but Turbopack's file tracing still walks into
  // them and chokes on at least one broken venv symlink in there.
  outputFileTracingExcludes: {
    '*': ['./data/projects/**'],
  },
};

export default nextConfig;
