# Banner Portal

Online portal for managing and sharing marketing banner assets with clients.

## Stack

- **Next.js** — admin dashboard + public client gallery
- **PostgreSQL** — Railway Postgres (production)
- **Cloudflare R2** — image storage
- **Railway** — deployment

## Features

### Admin (login required)
- Create clients and campaigns
- Nested folder structure (unlimited depth)
- One-click standard banner size folders
- Upload, replace, and delete banner images
- Copy shareable client URLs
- Invite team members

### Client gallery (public link)
- Browse folders without logging in
- View banner thumbnails
- Lightbox preview

Public URL format:
```
https://your-domain.com/g/{client-slug}/{campaign-slug}
```

Example:
```
https://your-domain.com/g/legoland/llcr-11598-01-holiday-2023-html5-banners
```

---

## Local setup

### 1. Install dependencies

```bash
cd banner-portal
npm install
```

Requires **Node.js 20+**.

### 2. Database (local)

For local development you can use:

- Railway Postgres (public URL from the Postgres service), or
- Local Postgres / [`npx prisma dev`](https://www.prisma.io/docs/postgres)

Set `DATABASE_URL` in `.env`.

### 3. Configure Cloudflare R2

You already have R2. You'll need:

| Variable | Where to find it |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → account ID |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Same token creation step |
| `R2_BUCKET_NAME` | Your bucket name |
| `R2_PUBLIC_URL` | Public bucket URL or custom domain |

**Enable public access** on the bucket (or attach a custom domain) so clients can view images in the gallery.

**New bucket?** R2 API tokens can be scoped to specific buckets. If you switch buckets, create a **new** R2 API token with **Object Read & Write** permission for the new bucket name, update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in Railway, and redeploy. Updating `R2_BUCKET_NAME` alone is not enough if the token is scoped to the old bucket.

**Verify storage** after deploy: visit `/api/health/storage` — it runs a test upload and reports which bucket name is configured.

**S3 TLS handshake failure?** If uploads fail with `EPROTO` / `SSL alert number 40`, your account's R2 S3 endpoint may not be provisioned. Add `CLOUDFLARE_API_TOKEN` (My Profile → API Tokens → Custom token → Account → **Workers R2 Storage** → **Edit**) and redeploy — the app will use Cloudflare's REST API instead.

**CORS** — add this CORS policy to your R2 bucket so browser uploads work:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app.up.railway.app",
      "https://your-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Environment variables

```bash
cp .env.example .env
```

Fill in all values. Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # SETUP_SECRET
```

### 5. Run database migration

```bash
npx prisma migrate dev --name init
```

### 6. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000/setup](http://localhost:3000/setup) to create the first admin account.

---

## Deploy to Railway

This app deploys as a long-running Node service (`next start`) with Railway Postgres.

### 1. Create the project

1. Open [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select [teamcornett/marketbanners](https://github.com/teamcornett/marketbanners)
3. Add a database: **+ New** → **Database** → **PostgreSQL**

### 2. Wire the app to Postgres

On the **web service** → **Variables**:

1. Add a **reference variable**: `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
2. Add the rest from `.env.example` (copy values from Vercel if migrating):

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | Same value as production if you want existing sessions to keep working |
| `SETUP_SECRET` | Required for `/setup` |
| `NEXT_PUBLIC_APP_URL` | Railway domain first, then your custom domain |
| `R2_*` / `CLOUDFLARE_API_TOKEN` | Keep existing R2 bucket — no re-upload needed |

`railway.toml` already sets:

- **Build:** `npm run build` (`prisma generate && next build`)
- **Pre-deploy:** `npx prisma migrate deploy`
- **Start:** `npm start`
- **Health check:** `/api/health`

### 3. Public URL

1. Service → **Settings** → **Networking** → **Generate Domain**
2. Set `NEXT_PUBLIC_APP_URL` to that URL (e.g. `https://marketbanners-production.up.railway.app`)
3. Redeploy so share/invite links use the correct host

### 4. R2 CORS

Add the Railway URL (and custom domain) to the R2 bucket CORS `AllowedOrigins` list, then redeploy if needed.

### 5. Smoke test

- [ ] `GET /api/health` → 200
- [ ] `GET /api/health/storage` → `ok: true`
- [ ] `/login` works
- [ ] Upload a banner
- [ ] Public gallery `/g/{client}/{campaign}` loads

If the database is empty, visit `/setup` once to create the admin account.

### Migrate existing Neon data (optional)

If production data still lives on Neon and you want it on Railway Postgres:

```bash
# Export from Neon (use the direct / non-pooler connection string)
pg_dump "$NEON_DATABASE_URL" --no-owner --no-acl -F c -f neon.dump

# Import into Railway (use the public DATABASE_URL from the Postgres service)
pg_restore --clean --if-exists --no-owner --no-acl -d "$RAILWAY_DATABASE_URL" neon.dump
```

Then skip re-running setup if users already exist. R2 assets stay where they are — only DB rows move.

### Cut over from Vercel

1. Point your custom domain’s CNAME at Railway (Networking → Custom Domain)
2. Update `NEXT_PUBLIC_APP_URL` to the custom domain and redeploy
3. Confirm smoke tests on the production domain
4. After 24–48 hours of stable traffic, disable or delete the Vercel project

---

## Standard banner sizes

The "Add standard size folders" button creates:

- 160×600
- 300×50
- 300×250
- 300×600
- 320×50
- 336×280
- 728×90

---

## Project structure

```
banner-portal/
├── railway.toml             # Railway build / migrate / healthcheck
├── prisma/schema.prisma     # Database models
├── src/
│   ├── app/
│   │   ├── admin/           # Admin dashboard
│   │   ├── g/               # Public client gallery
│   │   ├── api/             # API routes
│   │   ├── login/
│   │   ├── setup/
│   │   └── register/
│   ├── components/
│   └── lib/                 # Auth, R2, Prisma utilities
└── .env.example
```
