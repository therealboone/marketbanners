# Banner Portal

Online portal for managing and sharing marketing banner assets with clients.

## Stack

- **Next.js** — admin dashboard + public client gallery
- **Neon Postgres** — free-tier database
- **Cloudflare R2** — image storage
- **Vercel** — deployment

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

Requires **Node.js 20+** (Vercel uses Node 20 by default).

### 2. Create a Neon database (free)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string into `DATABASE_URL`

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

**New bucket?** R2 API tokens can be scoped to specific buckets. If you switch buckets, create a **new** R2 API token with **Object Read & Write** permission for the new bucket name, update `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in Vercel, and redeploy. Updating `R2_BUCKET_NAME` alone is not enough if the token is scoped to the old bucket.

**Verify storage** after deploy: visit `/api/health/storage` — it runs a test upload and reports which bucket name is configured.

**CORS** — add this CORS policy to your R2 bucket so browser uploads work:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
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

## Deploy to Vercel

1. Import [therealboone/marketbanners](https://github.com/therealboone/marketbanners) in [vercel.com](https://vercel.com)
2. Add all environment variables from `.env.example`
3. Set **Node.js version** to **20.x** in project settings
4. Deploy

### Run database migration (one time)

After adding `DATABASE_URL` in Vercel, run migrations from your machine:

```bash
DATABASE_URL="your-neon-connection-string" npm run db:deploy
```

Or paste the SQL from `prisma/migrations/20250609180000_init/migration.sql` into the Neon SQL editor.

After deploy, visit `https://your-domain.com/setup` once to create the admin account.

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
