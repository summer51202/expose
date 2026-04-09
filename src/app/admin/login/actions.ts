"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { verifyAdminCredentials } from "@/lib/auth/credentials";
import { createAdminSession } from "@/lib/auth/session";

type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!verifyAdminCredentials({ username, password })) {
    return {
      error: "帳號或密碼不正確，請再試一次。",
    };
  }

  await createAdminSession();
  redirect(siteConfig.adminPath);
}

export async function logoutAction() {
  const { clearAdminSession } = await import("@/lib/auth/session");
  await clearAdminSession();
  redirect(siteConfig.loginPath);
}
