# Convex Deployment Guide (Project Agnostic)

## Overview

Convex provides two environments per project:
- **Development**: Auto-syncs during `npx convex dev`
- **Production**: Manual deploy via `npx convex deploy`

---

## Environment Structure

```
Your Convex Project
├── Development
│   ├── Deployment: dev:{slug}
│   ├── URL: https://{slug}.convex.cloud
│   └── Database: Dev data (safe to reset)
│
└── Production
    ├── Deployment: prod:{slug}|{token}
    ├── URL: https://{slug}.convex.cloud
    ├── HTTP Actions: https://{slug}.convex.site
    └── Database: Live data (protect!)
```

---

## .env.local Template

```bash
# ============================================
# CONVEX CONFIGURATION
# ============================================

# Development (used by `npx convex dev`)
CONVEX_DEPLOYMENT=dev:{YOUR_DEV_SLUG}
VITE_CONVEX_URL=https://{YOUR_DEV_SLUG}.convex.cloud

# Production
CONVEX_PROD_DEPLOYMENT=prod:{YOUR_PROD_SLUG}|{YOUR_DEPLOY_TOKEN}
CONVEX_PROD_URL=https://{YOUR_PROD_SLUG}.convex.cloud
CONVEX_PROD_HTTP_ACTIONS=https://{YOUR_PROD_SLUG}.convex.site

# ============================================
# FRONTEND CONFIG (Vite/Next.js)
# ============================================

# Use dev URL locally, prod URL in production builds
VITE_CONVEX_URL=https://{SLUG}.convex.cloud
```

---

## Finding Your Values

### Convex Dashboard → Settings → URL & Deploy Key

| Field | Location | Format |
|-------|----------|--------|
| Deployment URL | Settings page | `https://{slug}.convex.cloud` |
| HTTP Actions URL | Settings page | `https://{slug}.convex.site` |
| Deploy Key | Generate button | `prod:{slug}|{base64_token}` |

### Dev Deployment String

After running `npx convex dev`, check `.env.local`:
```
CONVEX_DEPLOYMENT=dev:{slug}
```

### Prod Deployment String

1. Go to Convex Dashboard → Settings → URL & Deploy Key
2. Click "Generate Production Deploy Key"
3. Copy the full string: `prod:{slug}|{token}`

---

## Deployment Commands

```bash
# ─────────────────────────────────────
# DEVELOPMENT
# ─────────────────────────────────────

# Start dev server (auto-syncs changes)
npx convex dev

# ─────────────────────────────────────
# PRODUCTION
# ─────────────────────────────────────

# Deploy to production (uses default project)
npx convex deploy

# Deploy to specific production environment
CONVEX_DEPLOYMENT=$CONVEX_PROD_DEPLOYMENT npx convex deploy

# Deploy with explicit URL
npx convex deploy --url https://{slug}.convex.cloud
```

---

## URL Patterns

| URL Type | Pattern | Purpose |
|----------|---------|---------|
| Cloud URL | `https://{slug}.convex.cloud` | Backend API (queries, mutations) |
| Site URL | `https://{slug}.convex.site` | HTTP Actions (webhooks, auth callbacks) |
| Dashboard | `https://dashboard.convex.dev` | Web UI for management |

---

## Data Operations

```bash
# Export all data (backup)
npx convex export --path backup.zip

# Import data (restore/migrate)
npx convex import --path backup.zip

# Clear all data (DANGEROUS - dev only!)
npx convex import --replace --path empty.zip
```

---

## Environment Variables (Convex Dashboard)

Set in Dashboard → Settings → Environment Variables

| Variable | Example | Notes |
|----------|---------|-------|
| API keys | `sk_live_...` | Third-party services |
| Secrets | `webhook_secret_...` | Signing keys |
| Config | `SITE_URL=https://...` | Runtime config |

Access in Convex functions:
```typescript
const apiKey = process.env.MY_API_KEY;
const siteUrl = process.env.CONVEX_SITE_URL; // Auto-set by Convex
```

---

## Multi-Environment Workflow

### Option A: Single Project (Dev + Prod)

```bash
# Dev work
npx convex dev

# Ready for prod
npx convex deploy
```

### Option B: Separate Projects

```bash
# .env.local.dev
CONVEX_DEPLOYMENT=dev:project-dev-123

# .env.local.prod  
CONVEX_DEPLOYMENT=prod:project-prod-456|{token}

# Switch environments
cp .env.local.dev .env.local && npx convex dev
cp .env.local.prod .env.local && npx convex deploy
```

---

## CI/CD Integration

### Vercel

1. Generate Production Deploy Key in Convex Dashboard
2. Add to Vercel Environment Variables:
   ```
   CONVEX_DEPLOY_KEY=prod:{slug}|{token}
   ```
3. Vercel auto-deploys Convex on git push

### GitHub Actions

```yaml
- name: Deploy Convex
  env:
    CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_PROD_DEPLOYMENT }}
  run: npx convex deploy
```

---

## Auth Provider Integration

For OAuth callbacks (WorkOS, Clerk, Auth0, etc.):

| Environment | Redirect URI |
|-------------|--------------|
| Local dev | `http://localhost:{PORT}/auth/callback` |
| Production | `https://{slug}.convex.site/auth/callback` |

**Important**: Update redirect URIs in your auth provider when switching environments.

---

## Project Transfer / Migration

### Export from Source

```bash
npx convex export --path project-backup.zip
```

### Import to Destination

```bash
# Update .env.local with new project credentials
CONVEX_DEPLOYMENT=prod:{new-slug}|{new-token}

# Deploy schema & functions
npx convex deploy

# Import data
npx convex import --path project-backup.zip
```

### Post-Migration Checklist

- [ ] Environment variables set in new project
- [ ] Auth provider redirect URIs updated
- [ ] Frontend env vars updated (VITE_CONVEX_URL)
- [ ] DNS/domain configured (if applicable)
- [ ] Verify data integrity
- [ ] Test all critical flows

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Not authenticated" | Wrong deployment string | Check CONVEX_DEPLOYMENT format |
| "Project not found" | Typo in slug | Verify in dashboard |
| Deploy fails | Missing deploy key | Generate in dashboard |
| HTTP Actions 404 | Wrong URL | Use `.convex.site` not `.convex.cloud` |
| Old data showing | Deployed to wrong env | Check which deployment is active |

---

## Quick Reference

```bash
# Check current deployment
cat .env.local | grep CONVEX

# View dashboard
npx convex dashboard

# Check deployment status
npx convex status

# Logs
npx convex logs
npx convex logs --history 50
```
