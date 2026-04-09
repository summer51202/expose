import type { NextConfig } from "next";

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
};

export default nextConfig;
