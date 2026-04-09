# Docker PostgreSQL + pgAdmin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Docker-based PostgreSQL and pgAdmin setup that supports Prisma migrations and manual data inspection for `P1-DATA`.

**Architecture:** Keep infrastructure config under `docker/` and keep the app connection string in the repo root `.env`. Use one Docker Compose file with two services, one named volume for PostgreSQL persistence, and documented defaults that match the local Prisma workflow.

**Tech Stack:** Docker Compose, PostgreSQL, pgAdmin 4, Prisma

---

### Task 1: Add Docker Compose Infrastructure

**Files:**
- Create: `docker/compose.yml`
- Create: `docker/.env.docker`

- [ ] **Step 1: Create the Docker service definitions**

Add a compose file that defines:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: expose-postgres
    restart: unless-stopped
    env_file:
      - .env.docker
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
```

The `postgres` service must also include:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- named volume `postgres_data`
- healthcheck using `pg_isready`

The `pgadmin` service must include:

```yaml
  pgadmin:
    image: dpage/pgadmin4:8
    container_name: expose-pgadmin
    restart: unless-stopped
    env_file:
      - .env.docker
    ports:
      - "${PGADMIN_PORT:-5050}:80"
    depends_on:
      postgres:
        condition: service_healthy
```

- [ ] **Step 2: Add Docker environment defaults**

Create `docker/.env.docker` with:

```env
POSTGRES_DB=expose
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
PGADMIN_DEFAULT_EMAIL=admin@local.dev
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050
```

- [ ] **Step 3: Verify the compose file is internally consistent**

Check that:
- `.env.docker` variable names match `compose.yml`
- `pgadmin` uses `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD`
- the named volume is declared at the bottom of the file

### Task 2: Align the Documentation With the Actual Files

**Files:**
- Modify: `docs/docker-postgres-pgadmin-workflow.md`

- [ ] **Step 1: Confirm the documented defaults match the real files**

The document must match:
- image choices
- port defaults
- service names
- reset workflow
- pgAdmin host value `postgres`

- [ ] **Step 2: Add one exact startup example**

Ensure the doc shows:

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker up -d
```

and the root `.env` value:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expose?schema=public"
```

### Task 3: Verification

**Files:**
- Read: `docker/compose.yml`
- Read: `docker/.env.docker`
- Read: `docs/docker-postgres-pgadmin-workflow.md`

- [ ] **Step 1: Validate file presence and content**

Confirm all three files exist and the core settings align:
- PostgreSQL host port `5432`
- pgAdmin host port `5050`
- DB name `expose`
- pgAdmin login `admin@local.dev`

- [ ] **Step 2: Run a lightweight config review**

If Docker is available, run:

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker config
```

Expected:
- Compose renders successfully
- No missing environment variable errors

- [ ] **Step 3: Report any local blockers clearly**

If Docker is not installed or unavailable in the execution environment, report that the files were created and content-reviewed, and tell the user the exact command to run locally.
