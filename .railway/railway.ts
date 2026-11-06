import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const exposeVolume = volume("expose-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 500 });
  const expose = service("expose", {
    source: github("summer51202/expose", { branch: "master", checkSuites: false }),
    start: "npx prisma migrate deploy && exec node scripts/start.mjs",
    replicas: { "us-east4-eqdc4a": 1 },
    volumeMounts: { "/data": exposeVolume },
    env: { ADMIN_PASSWORD: preserve(), ADMIN_USERNAME: preserve(), AUTH_SECRET: preserve(), DATABASE_URL: preserve(), DATA_BACKEND: preserve(), R2_ACCESS_KEY_ID: preserve(), R2_ACCOUNT_ID: preserve(), R2_BUCKET_NAME: preserve(), R2_ENDPOINT: preserve(), R2_PUBLIC_BASE_URL: preserve(), R2_SECRET_ACCESS_KEY: preserve(), SITE_URL: preserve(), STORAGE_BACKEND: preserve() },
  });

  return project("expose", {
    resources: [expose, exposeVolume],
  });
});
