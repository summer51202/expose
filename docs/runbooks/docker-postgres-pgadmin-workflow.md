# Docker PostgreSQL + pgAdmin 開發流程

## 目的

這份文件定義 `P1-DATA` 開發階段使用的本機資料庫方案，目標是讓你可以用 Docker 啟動 PostgreSQL 與 pgAdmin，並讓 Prisma 與 pgAdmin 都連到同一個開發資料庫。

這份文件涵蓋：
- 啟動 workflow
- 重置 workflow
- 連線埠與預設值
- Prisma 如何連線
- pgAdmin 如何連線
- 驗證步驟

不涵蓋：
- 正式環境部署
- 備份策略
- Cloudflare R2 設定

## 目錄規劃

開發用 DB 相關檔案統一放在 `docker/`。

```text
docker/
  compose.yml
  .env.docker
```

應用程式自己的環境變數維持放在專案根目錄：

```text
.env
```

責任分工如下：
- `docker/compose.yml`：定義 `postgres` 與 `pgadmin` 服務
- `docker/.env.docker`：提供 Docker 服務啟動所需帳密與 port
- `.env`：提供 Next.js / Prisma 使用的 `DATABASE_URL`

## 服務架構

這套本機開發方案包含兩個容器：

1. `postgres`
- 提供 Prisma migration、資料匯入、網站讀寫資料
- 使用 Docker volume 持久化資料

2. `pgadmin`
- 讓你透過瀏覽器查看 schema、table、資料內容
- 與 `postgres` 位於同一個 Docker network

資料流如下：

```text
Next.js / Prisma (host machine)
  -> localhost:5432
  -> postgres container

Browser
  -> http://localhost:5050
  -> pgAdmin container
  -> postgres service name "postgres"
```

## 預設值

### PostgreSQL

- Database: `expose`
- Username: `postgres`
- Password: `postgres`
- Host port: `5432`
- Container port: `5432`

### pgAdmin

- Login email: `admin@local.dev`
- Login password: `admin123`
- Host port: `5050`
- Container port: `80`

### Docker 專用 env 建議值

`docker/.env.docker`

```env
POSTGRES_DB=expose
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

PGADMIN_DEFAULT_EMAIL=admin@local.dev
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050
```

### Prisma / App `.env` 建議值

專案根目錄 `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expose?schema=public"
```

如果你本機已有其他 PostgreSQL 服務占用 `5432`，可以把 Docker host port 改成 `5433`，並同步改成：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/expose?schema=public"
```

## 啟動 Workflow

這是平常開發時的標準流程。

### 1. 啟動 Docker 服務

在專案根目錄執行：

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker up -d
```

預期結果：
- `postgres` container 啟動
- `pgadmin` container 啟動

### 2. 確認 PostgreSQL 已可用

先確認容器狀態：

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker ps
```

你要確認：
- `postgres` 狀態為 running
- 最好有 healthcheck 並顯示 healthy
- `pgadmin` 狀態為 running

### 3. 檢查專案 `.env`

確認專案根目錄 `.env` 內的 `DATABASE_URL` 指向 Docker PostgreSQL：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expose?schema=public"
```

### 4. 執行 Prisma migration

```powershell
npx prisma migrate dev
```

目的：
- 根據 `prisma/schema.prisma` 建立或更新資料庫結構

成功後代表：
- PostgreSQL 可被 Prisma 連線
- schema 可以正確套用到 DB

### 5. 產生 Prisma Client

如果 migration 流程沒有自動完成 client 更新，再補跑：

```powershell
npx prisma generate
```

### 6. 匯入既有 JSON 資料

當你準備把現有 JSON 資料匯進 PostgreSQL 時，執行：

```powershell
npm run data:migrate:prisma
```

### 7. 驗證匯入結果

```powershell
npm run data:verify:prisma
```

### 8. 用 pgAdmin 檢查資料

打開：

```text
http://localhost:5050
```

登入後新增 PostgreSQL server，確認：
- `expose` database 存在
- table 已建立
- 匯入的資料筆數合理

## 重置 Workflow

這套方案預設保留資料，但要提供明確的重建流程。

### 情境 A: 一般重啟，不刪資料

停止容器：

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker down
```

重新啟動：

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker up -d
```

效果：
- 容器重建或重啟
- volume 保留
- 資料仍存在

適用情境：
- 一般開發
- 重新套用 compose 設定
- 單純想重啟服務

### 情境 B: 全新重建，刪除資料

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker down -v
```

效果：
- 容器移除
- volume 一起刪除
- PostgreSQL 資料全部清空

重建順序：

```powershell
docker compose -f docker/compose.yml --env-file docker/.env.docker up -d
npx prisma migrate dev
npx prisma generate
npm run data:migrate:prisma
npm run data:verify:prisma
```

適用情境：
- schema 改動很大，想乾淨重來
- 匯入流程測試失敗，想重做
- 本機 DB 狀態已混亂

### 重置注意事項

- `down -v` 是破壞性操作，會刪除資料庫內容
- 在做 `down -v` 前，先確認你不需要保留目前 DB 狀態
- 如果只是想重啟服務，不要加 `-v`

## Prisma 如何連這個 DB

Prisma 從宿主機直接連 Docker 映射出來的 PostgreSQL port，所以使用：
- Host: `localhost`
- Port: `5432`
- Database: `expose`
- Username: `postgres`
- Password: `postgres`

對 Prisma 而言，最重要的是專案根目錄 `.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expose?schema=public"
```

常用 Prisma 指令：

```powershell
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

成功判斷點：
- `migrate dev` 能成功執行
- `generate` 能成功產生 client
- `prisma studio` 能打開並看見資料

## pgAdmin 如何連這個 DB

先在瀏覽器開啟：

```text
http://localhost:5050
```

登入 pgAdmin 使用：
- Email: `admin@local.dev`
- Password: `admin123`

登入後新增一個 server，建議填法如下。

### General

- Name: `Expose Local DB`

### Connection

- Host name/address: `postgres`
- Port: `5432`
- Maintenance database: `expose`
- Username: `postgres`
- Password: `postgres`

這裡特別注意：
- Prisma 從宿主機連 DB，所以用 `localhost`
- pgAdmin 也在 Docker network 裡，所以要填 Docker service name `postgres`

如果在 pgAdmin 裡把 Host 填成 `localhost`，通常會連不到你想要的 PostgreSQL 容器。

## 建議的 `docker/compose.yml` 設計要求

正式建立 `docker/compose.yml` 時，建議包含以下設計：

- `postgres` 使用官方 PostgreSQL image
- `pgadmin` 使用官方 `dpage/pgadmin4` image
- `postgres` 加上 healthcheck
- `postgres` 與 `pgadmin` 都使用 `docker/.env.docker`
- PostgreSQL data 使用 named volume 持久化
- `pgadmin` 依賴 `postgres`

最低需求如下：

```text
services:
  postgres:
    image: postgres
    ports:
      - "${POSTGRES_PORT}:5432"
    environment:
      POSTGRES_DB
      POSTGRES_USER
      POSTGRES_PASSWORD
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    ports:
      - "${PGADMIN_PORT}:80"
    environment:
      PGADMIN_DEFAULT_EMAIL
      PGADMIN_DEFAULT_PASSWORD
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## 驗證 Checklist

### Docker 層

1. `docker compose -f docker/compose.yml --env-file docker/.env.docker up -d`
2. `docker compose -f docker/compose.yml --env-file docker/.env.docker ps`
3. 確認 `postgres` 與 `pgadmin` 都是 running

### Prisma 層

1. `.env` 設定 `DATABASE_URL`
2. `npx prisma migrate dev`
3. `npx prisma generate`
4. 確認沒有 `DATABASE_URL not found` 或 `connection refused`

### 資料層

1. `npm run data:migrate:prisma`
2. `npm run data:verify:prisma`
3. 確認 albums / photos / comments / likes 的數量合理

### pgAdmin 層

1. 開 `http://localhost:5050`
2. 用預設帳密登入
3. 新增 `Expose Local DB`
4. 確認能看到 `expose` database
5. 確認能看到 Prisma 建出的 tables

## 常見問題

### 1. `P1012 Environment variable not found: DATABASE_URL`

原因：
- 專案根目錄 `.env` 沒有 `DATABASE_URL`

解法：
- 補上正確的 `DATABASE_URL`

### 2. `Can't reach database server`

原因可能是：
- Docker 沒啟動
- PostgreSQL container 還沒 ready
- port 被占用
- `.env` 的 port 填錯

解法：
- 先看 `docker compose ... ps`
- 再看 `DATABASE_URL`

### 3. `5432` 已被占用

解法：
- 把 `docker/.env.docker` 的 `POSTGRES_PORT` 改成 `5433`
- 同步更新專案 `.env` 的 `DATABASE_URL`

### 4. pgAdmin 連不到資料庫

常見原因：
- 在 pgAdmin 裡把 host 寫成 `localhost`

正確做法：
- 在 pgAdmin 裡把 host 寫成 `postgres`

## 建議執行順序

如果你現在要正式開始接 Prisma，建議照這個順序做：

1. 建立 `docker/compose.yml`
2. 建立 `docker/.env.docker`
3. 啟動 Docker PostgreSQL 與 pgAdmin
4. 設定專案根目錄 `.env` 的 `DATABASE_URL`
5. 跑 `npx prisma migrate dev`
6. 跑 `npx prisma generate`
7. 跑 `npm run data:migrate:prisma`
8. 跑 `npm run data:verify:prisma`
9. 用 pgAdmin 檢查資料

完成以上步驟後，才進入 `DATA_BACKEND=prisma` 的實際切換驗證。
