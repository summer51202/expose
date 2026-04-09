type BuildSecurityHeadersOptions = {
  isDev: boolean;
  remoteImageHosts: string[];
};

function toPolicyValue(directives: Array<[string, string[]]>) {
  return directives
    .map(([key, values]) => `${key} ${values.join(" ")}`.trim())
    .join("; ");
}

export function buildSecurityHeaders({
  isDev,
  remoteImageHosts,
}: BuildSecurityHeadersOptions) {
  const imageSources = [
    "'self'",
    "blob:",
    "data:",
    ...remoteImageHosts.map((host) => `https://${host}`),
  ];
  const connectSources = ["'self'"];
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (isDev) {
    scriptSources.push("'unsafe-eval'");
  }

  const contentSecurityPolicy = toPolicyValue([
    ["default-src", ["'self'"]],
    ["script-src", scriptSources],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", imageSources],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connectSources],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["upgrade-insecure-requests", []],
  ]);

  return {
    "Content-Security-Policy": contentSecurityPolicy,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  };
}
