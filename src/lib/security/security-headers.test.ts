import assert from "node:assert/strict";

import { buildSecurityHeaders } from "./security-headers.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("buildSecurityHeaders includes baseline hardening headers", () => {
  const headers = buildSecurityHeaders({
    isDev: false,
    remoteImageHosts: ["pub.example.r2.dev"],
  });

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(
    headers["Referrer-Policy"],
    "strict-origin-when-cross-origin",
  );
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
});

runTest("buildSecurityHeaders includes a CSP with the required directives", () => {
  const headers = buildSecurityHeaders({
    isDev: false,
    remoteImageHosts: ["pub.example.r2.dev"],
  });
  const csp = headers["Content-Security-Policy"];

  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /img-src 'self' blob: data: https:\/\/pub\.example\.r2\.dev/);
});

runTest("buildSecurityHeaders allows unsafe-eval only in development", () => {
  const devHeaders = buildSecurityHeaders({
    isDev: true,
    remoteImageHosts: [],
  });
  const prodHeaders = buildSecurityHeaders({
    isDev: false,
    remoteImageHosts: [],
  });

  assert.match(devHeaders["Content-Security-Policy"], /'unsafe-eval'/);
  assert.doesNotMatch(
    prodHeaders["Content-Security-Policy"],
    /'unsafe-eval'/,
  );
});
