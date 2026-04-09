# Launch Checklist

## Before Deploy
- [ ] Set production `AUTH_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`
- [ ] Set `DATA_BACKEND=prisma`
- [ ] Set `STORAGE_BACKEND=r2`
- [ ] Set all R2 env vars
- [ ] Set a working `DATABASE_URL`
- [ ] Run `npx eslint .`
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run build`

## Local Notes
- [ ] For the SQLite path, use `DATABASE_URL="file:./expose.db"` because the path is resolved from `prisma/schema.prisma`
- [ ] On this Windows machine, Prisma + SQLite works reliably from `%TEMP%` (for example `file:C:/Users/EDWARD~1/AppData/Local/Temp/expose-local.db`) and was unstable when the `.db` lived inside the workspace
- [ ] If you stay on PostgreSQL instead, this machine's local service listens on port `5433`, not `5432`
- [ ] `.session/verify.ps1` still hits a Windows/Turbopack file rename issue during scripted builds
- [ ] Use direct `npm run build` as the current reliable build verification command

## After Deploy
- [ ] Open `/admin/login`
- [ ] Log in with non-default admin credentials
- [ ] Create one album
- [ ] Upload one photo
- [ ] Confirm the photo appears on `/`
- [ ] Confirm the photo appears on `/albums/[slug]`
- [ ] Confirm the photo detail page opens at `/photos/uploaded/[id]`

## Data and Storage
- [ ] Confirm Prisma migrations have been applied against the real database file or hosted database
- [ ] Confirm uploaded files land in the configured R2 bucket
- [ ] Confirm public image URLs use the configured R2 base URL
- [ ] Confirm database backups are scheduled
- [ ] Confirm R2 bucket lifecycle / backup expectations are documented
