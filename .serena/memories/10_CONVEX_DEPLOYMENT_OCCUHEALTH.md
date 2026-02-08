# OccuHealth Convex Deployment Configuration

## Environments

| Environment | Deployment ID | URL | Region |
|-------------|---------------|-----|--------|
| Development | accurate-warbler-380 | https://accurate-warbler-380.eu-west-1.convex.cloud | EU West 1 |
| Production | exciting-herring-835 | https://exciting-herring-835.eu-west-1.convex.cloud | EU West 1 |

## Production Details

```
Project: OccuHealth
Account: Alt email (m4stergr1ef@gmail.com) — intended for client handover
Production Slug: exciting-herring-835

Deployment URL (Backend API):
https://exciting-herring-835.eu-west-1.convex.cloud

HTTP Actions URL (Auth callbacks, webhooks):
https://exciting-herring-835.eu-west-1.convex.site
```

## Environment Variables (.env.local)

```bash
# Development (used by `npx convex dev`)
CONVEX_DEV_DEPLOYMENT=dev:accurate-warbler-380|eyJ2MiI6IjA0YWQwODVjNWY4MDQzZjg5ZGJhMTE2YzlkMWU0NWVmIn0=
CONVEX_DEV_URL=https://accurate-warbler-380.eu-west-1.convex.cloud
VITE_CONVEX_URL=https://accurate-warbler-380.eu-west-1.convex.cloud

# Production
CONVEX_PROD_DEPLOYMENT=prod:exciting-herring-835|eyJ2MiI6IjZkMDRiMTBhODQ3ODRjYzc4OTBlNDJhZDViYWQzMmMyIn0=
CONVEX_PROD_URL=https://exciting-herring-835.eu-west-1.convex.cloud
CONVEX_DEV_HTTP_ACTIONS=https://exciting-herring-835.eu-west-1.convex.site
```

## Convex Backend Env Vars (Set via CLI)

```bash
WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
WORKOS_API_KEY=sk_test_*  # WorkOS staging key
OPENAI_API_KEY=sk-proj-*  # GPT-5 Mini + RAG embeddings
```

## Deployment Commands

```bash
# Development (auto-sync) — requires login to alt Convex account
npx convex dev

# Production deploy
npx convex deploy

# Seed admin user on fresh deployment
npx convex run seedAdmin:seedAdmin '{"workosUserId":"user_01KE4VZAPHYY71HZ0XWWWVK936","email":"testadmin@occuhealth.com","firstName":"Test","lastName":"Admin"}'
```

## WorkOS Integration

| Environment | Redirect URI |
|-------------|--------------|
| Local (5175) | http://localhost:5175 |
| Local (5176) | http://localhost:5176 |
| Dev | https://accurate-warbler-380.eu-west-1.convex.site/auth/callback (Default) |
| Prod | https://exciting-herring-835.eu-west-1.convex.site/auth/callback |

## Test Accounts (WorkOS)

| Role | Email | WorkOS ID | Password |
|------|-------|-----------|----------|
| Admin | testadmin@occuhealth.com | user_01KE4VZAPHYY71HZ0XWWWVK936 | (TestPass1234 |
| Employer | testemployee@occuhealth.com | user_01KE2KZFNT7A3HRQJ980NKCHQV | (TestPass1234 |
| Doctor | testdoc@occuhealth.com | user_01KE2KYS77D57ZE1M9NCK2365Y | (TestPass1234 |

## Architecture

```
Frontend (Vercel / localhost)
         │
         ▼
┌──────────────────────────────────────┐
│  Convex Cloud (EU West 1)            │
│  Dev:  accurate-warbler-380          │
│  Prod: exciting-herring-835          │
│                                      │
│  .convex.cloud ← API calls (queries/mutations) │
│  .convex.site  ← HTTP Actions (auth callbacks)  │
└──────────────────────────────────────┘
         │
         ▼
    WorkOS Auth (AuthKit)
    Client: Zenith (Staging)
```

## Auth Callback Priority

Backend (`convex/http.ts`) checks roles in order: **admin → doctor → employer**.
Admin is highest privilege. Prevents role collision if user exists in multiple tables.

## Fresh Deployment Checklist

1. Set Convex env vars: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `OPENAI_API_KEY`
2. Add WorkOS redirect URIs for dev + prod Convex `.site` URLs
3. Seed admin user via `npx convex run seedAdmin:seedAdmin`
4. Register test employer + doctor via UI
5. Admin verifies employer via `/admin/employers`
