# OccuHealth Convex Deployment Configuration

## Environments

| Environment | Deployment ID | URL |
|-------------|---------------|-----|
| Development | giddy-lapwing-915 | https://giddy-lapwing-915.convex.cloud |
| Production | spotted-porpoise-17 | https://spotted-porpoise-17.convex.cloud |

## Production Details

```
Project: Occuhealth
Team: mastergrief
Production Slug: spotted-porpoise-17

Deployment URL (Backend API):
https://spotted-porpoise-17.convex.cloud

HTTP Actions URL (Auth callbacks, webhooks):
https://spotted-porpoise-17.convex.site

Available as: process.env.CONVEX_SITE_URL in Convex functions
```

## Environment Variables (.env.local)

```bash
# Development (used by `npx convex dev`)
CONVEX_DEPLOYMENT=dev:giddy-lapwing-915
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud

# Production
CONVEX_PROD_DEPLOYMENT=prod:spotted-porpoise-17|eyJ2MiI6ImY2Njg3YWU5NmVjYzQwZjNiYWVjMTBkNzhiYTdiNTM1In0=
CONVEX_PROD_URL=https://spotted-porpoise-17.convex.cloud
CONVEX_PROD_HTTP_ACTIONS=https://spotted-porpoise-17.convex.site
```

## Deployment Commands

```bash
# Development (auto-sync)
npx convex dev

# Production deploy
npx convex deploy

# Or explicitly specify production
CONVEX_DEPLOYMENT=$CONVEX_PROD_DEPLOYMENT npx convex deploy
```

## WorkOS Integration

WorkOS redirect URIs must match the environment:

| Environment | Redirect URI |
|-------------|--------------|
| Dev | http://localhost:5175/auth/callback |
| Prod | https://spotted-porpoise-17.convex.site/auth/callback |

## Architecture

```
Frontend (Vercel/localhost)
         │
         ▼
┌─────────────────────────────────┐
│  Convex Cloud                   │
│  spotted-porpoise-17            │
│                                 │
│  .convex.cloud ← API calls      │
│  .convex.site  ← HTTP Actions   │
└─────────────────────────────────┘
         │
         ▼
    WorkOS Auth
```

## Handover Note

When transferring to doctor's account:
- New project will have different slug (e.g., `doctors-project-xx`)
- All URLs change accordingly
- Update: Vercel env vars, WorkOS redirect URIs, frontend config
