import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-build/**",
    ".next-build-output/**",
    ".next-verify-build/**",
    ".next-init-build/**",
    ".next-claude-dev/**",
    // Per-worktree dev servers (NEXT_DIST_DIR=.next-wt-<name>).
    ".next-wt-*/**",
    ".worktrees/**",
    ".claude/worktrees/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "temp-app/**",
  ]),
]);

export default eslintConfig;
