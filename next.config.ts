import type { NextConfig } from "next";

import { buildSecurityHeaders } from "@/lib/security/security-headers";

function getRemoteImagePatterns() {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!publicBaseUrl) {
    return [];
  }

  try {
    const url = new URL(publicBaseUrl);

    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
  }
}

function getRemoteImageHosts() {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!publicBaseUrl) {
    return [];
  }

  try {
    return [new URL(publicBaseUrl).host];
  } catch {
    return [];
  }
}

const securityHeaders = buildSecurityHeaders({
  isDev: process.env.NODE_ENV !== "production",
  remoteImageHosts: getRemoteImageHosts(),
});

const nextConfig: NextConfig = {
  distDir:
    process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "development" ? ".next" : ".next-build-output"),
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: getRemoteImagePatterns(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(securityHeaders).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
