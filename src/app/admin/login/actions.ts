"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { getHashedRequestFingerprint } from "@/lib/security/request-fingerprint";
import { rateLimiter, type RateLimitOptions } from "@/lib/security/rate-limit";
import { createAdminSession } from "@/lib/auth/session";

type LoginState = {
  error?: string;
};

const LOGIN_ERROR_MESSAGE = "登入失敗，請稍後再試一次。";
const NETWORK_LOGIN_LIMIT: RateLimitOptions = {
  limit: 5,
  windowMs: 5 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
};
const ACCOUNT_LOGIN_LIMIT: RateLimitOptions = {
  limit: 3,
  windowMs: 10 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const fingerprint = await getHashedRequestFingerprint();
  const normalizedUsername = username.toLowerCase() || "anonymous";
  const networkKey = `login:network:${fingerprint}`;
  const accountKey = `login:account:${normalizedUsername}:${fingerprint}`;

  const networkAttempt = rateLimiter.check(networkKey, NETWORK_LOGIN_LIMIT);
  const accountAttempt = rateLimiter.check(accountKey, ACCOUNT_LOGIN_LIMIT);

  if (!networkAttempt.allowed || !accountAttempt.allowed) {
    return {
      error: LOGIN_ERROR_MESSAGE,
    };
  }

  if (!verifyAdminCredentials({ username, password })) {
    return {
      error: LOGIN_ERROR_MESSAGE,
    };
  }

  rateLimiter.reset(networkKey);
  rateLimiter.reset(accountKey);
  await createAdminSession();
  redirect(siteConfig.adminPath);
}

export async function logoutAction() {
  const { clearAdminSession } = await import("@/lib/auth/session");
  await clearAdminSession();
  redirect(siteConfig.loginPath);
}
