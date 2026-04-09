import "server-only";

export type AuthConfig = {
  username: string;
  password: string;
  secret: string;
  isUsingDefaultUsername: boolean;
  isUsingDefaultPassword: boolean;
  isUsingFallbackSecret: boolean;
};

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "change-me";
const FALLBACK_SECRET = "local-dev-secret-change-me-123456";
const MIN_SECRET_LENGTH = 32;

let hasWarnedForDevFallbacks = false;

function readAuthConfig(): AuthConfig {
  const username = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const secret = process.env.AUTH_SECRET || FALLBACK_SECRET;

  return {
    username,
    password,
    secret,
    isUsingDefaultUsername: username === DEFAULT_USERNAME,
    isUsingDefaultPassword: password === DEFAULT_PASSWORD,
    isUsingFallbackSecret: secret === FALLBACK_SECRET,
  };
}

function assertAuthConfig(config: AuthConfig) {
  if (config.secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    if (
      !hasWarnedForDevFallbacks &&
      (config.isUsingDefaultUsername ||
        config.isUsingDefaultPassword ||
        config.isUsingFallbackSecret)
    ) {
      hasWarnedForDevFallbacks = true;
      console.warn(
        [
          "[auth] Development fallback credentials are in use.",
          "Set ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_SECRET in .env before production deployment.",
        ].join(" "),
      );
    }

    return config;
  }

  if (config.isUsingDefaultUsername || config.isUsingDefaultPassword) {
    throw new Error(
      "Production auth config cannot use the default admin credentials.",
    );
  }

  if (config.isUsingFallbackSecret) {
    throw new Error(
      "Production auth config cannot use the fallback AUTH_SECRET.",
    );
  }

  return config;
}

export function getAuthConfig(): AuthConfig {
  return assertAuthConfig(readAuthConfig());
}

export function getAdminCredentials() {
  const config = getAuthConfig();

  return {
    username: config.username,
    password: config.password,
    secret: config.secret,
  };
}
