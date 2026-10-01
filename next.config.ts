import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.102.117.86'],
  output: 'standalone',
  // Raw school-project sources kept locally for AI analysis (see data/README.md)
  // aren't part of the app, but Turbopack's file tracing still walks into
  // them and chokes on at least one broken venv symlink in there.
  outputFileTracingExcludes: {
    '*': ['./data/projects/**'],
  },
};

export default nextConfig;
