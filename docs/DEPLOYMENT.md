# OccuFlow Deployment Guide

Comprehensive guide for deploying the OccuFlow occupational health platform to staging and production environments.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20+ | Runtime environment |
| npm | 10+ | Package management |
| Convex CLI | Latest | `npm i -g convex` |
| WorkOS Account | - | Authentication provider |
| Git | 2.x | Version control |

### Verify Prerequisites

```bash
node --version    # Should be v20+
npm --version     # Should be v10+
npx convex --help # Should show Convex CLI commands
```

## Environment Configuration

### Required Environment Variables

Create `.env.local` in the project root with the following variables:

#### Development Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CONVEX_DEPLOYMENT` | Development deployment ID | `dev:your-deployment-123` |
| `VITE_CONVEX_URL` | Development Convex API URL | `https://your-deployment-123.convex.cloud` |

#### Production Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CONVEX_PROD_DEPLOYMENT` | Production deployment ID with token | `prod:your-prod-123\|<base64-token>` |
| `CONVEX_PROD_URL` | Production Convex API URL | `https://your-prod-123.convex.cloud` |
| `CONVEX_PROD_HTTP_ACTIONS` | Production HTTP actions URL | `https://your-prod-123.convex.site` |

#### WorkOS Authentication Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WORKOS_API_KEY` | WorkOS API key (server-side) | `sk_test_...` or `sk_live_...` |
| `WORKOS_CLIENT_ID` | WorkOS client ID (server-side) | `client_01K...` |
| `VITE_WORKOS_CLIENT_ID` | WorkOS client ID (client-side) | `client_01K...` |

#### Application URLs

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_URL` | Frontend application URL | `http://localhost:5175` (dev) or `https://app.example.com` (prod) |
| `CONVEX_SITE_URL` | Convex HTTP actions URL | Set automatically in Convex environment |

### Environment Template

```bash
# Development (used by `npx convex dev`)
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud

# Production
CONVEX_PROD_DEPLOYMENT=prod:your-prod-name|<token>
CONVEX_PROD_URL=https://your-prod-name.convex.cloud
CONVEX_PROD_HTTP_ACTIONS=https://your-prod-name.convex.site

# WorkOS Authentication
WORKOS_API_KEY=sk_test_your_key_here
WORKOS_CLIENT_ID=client_your_id_here
VITE_WORKOS_CLIENT_ID=client_your_id_here

# Application URL
APP_URL=http://localhost:5175
```

## Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd convex-medical-starter

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Initialize Convex (first-time only)
npx convex dev --once

# 5. Start development servers
npm run dev
```

### Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start frontend + backend + typecheck (parallel) |
| `npm run dev:frontend` | Start Vite dev server only |
| `npm run dev:backend` | Start Convex dev server only |
| `npm run typecheck` | Run TypeScript type checking |

## Staging Deployment

Staging uses the development Convex deployment for testing before production.

### Deploy Backend to Staging

```bash
# 1. Run typecheck first (required)
npm run typecheck

# 2. Deploy to staging
npm run convex:deploy

# This runs: npm run typecheck && convex deploy --typecheck=disable
```

### Verify Staging Deployment

```bash
# Check deployment status
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json

# Test health endpoint
curl https://your-deployment.convex.site/health
```

Expected health response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "service": "convex-medical-starter"
}
```

## Production Deployment

Production deployment requires additional verification steps.

### Pre-Deployment Checklist

- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation clean (`npm run typecheck`)
- [ ] Environment variables configured for production
- [ ] WorkOS redirect URIs configured for production domain
- [ ] Database schema migrations reviewed

### Deploy Backend to Production

```bash
# 1. Ensure clean build
npm run typecheck

# 2. Deploy to production
npm run convex:deploy:prod

# This runs: npm run typecheck && convex deploy --typecheck=disable --prod
```

### Verify Production Deployment

```bash
# Check production health endpoint
curl https://your-prod-deployment.convex.site/health
```

## Frontend Deployment

The frontend is a standard Vite application that can be deployed to any static hosting provider.

### Build Frontend

```bash
# Full build with typecheck
npm run build

# Output directory: dist/
```

### Build Output Structure

```
dist/
  index.html          # Entry point
  assets/
    index-*.js        # Application bundle
    index-*.css       # Styles
```

### Hosting Options

| Provider | Deploy Command | Notes |
|----------|----------------|-------|
| Vercel | `vercel` | Auto-detects Vite |
| Netlify | `netlify deploy --prod` | Set publish dir to `dist` |
| Cloudflare Pages | `wrangler pages deploy dist` | - |
| AWS S3 + CloudFront | `aws s3 sync dist/ s3://bucket` | Requires CloudFront setup |

### Environment Variables for Hosting

Configure these in your hosting provider's dashboard:

| Variable | Value |
|----------|-------|
| `VITE_CONVEX_URL` | Production Convex URL |
| `VITE_WORKOS_CLIENT_ID` | WorkOS client ID |

## WorkOS Configuration

### Redirect URI Configuration

Configure these redirect URIs in the [WorkOS Dashboard](https://dashboard.workos.com):

| Environment | Redirect URI |
|-------------|--------------|
| Development | `http://localhost:5175/auth/callback` |
| Staging | `https://your-staging.convex.site/auth/callback` |
| Production | `https://your-prod.convex.site/auth/callback` |

### AuthKit Settings

1. Navigate to WorkOS Dashboard > Authentication > AuthKit
2. Enable AuthKit for your environment
3. Configure allowed origins:
   - `http://localhost:5175` (development)
   - `https://your-production-domain.com` (production)

### Session Configuration

WorkOS sessions are configured in the backend. Default settings:
- Session timeout: 7 days
- Token refresh: Automatic via `/auth/refresh` endpoint

## Rollback Procedures

### Backend Rollback (Convex)

Convex maintains deployment history. To rollback:

```bash
# View deployment history
npx convex deployments list

# Rollback to specific deployment (contact Convex support for manual rollback)
# Alternatively, redeploy from a known-good git commit
git checkout <known-good-commit>
npm run convex:deploy:prod
```

### Frontend Rollback

Most hosting providers maintain deployment history:

**Vercel:**
```bash
vercel rollback
```

**Netlify:**
Use the Netlify dashboard to select a previous deployment.

### Database Schema Rollback

Schema changes in Convex are additive. To rollback:

1. Create a new migration that reverses changes
2. Deploy the migration
3. Note: Removing fields requires data migration first

## Health Check and Monitoring

### Health Endpoint

| Endpoint | Method | URL |
|----------|--------|-----|
| Health Check | GET | `{CONVEX_SITE_URL}/health` |

**Request:**
```bash
curl -X GET https://your-deployment.convex.site/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-08T12:00:00.000Z",
  "service": "convex-medical-starter"
}
```

### Monitoring Recommendations

| Tool | Purpose |
|------|---------|
| Convex Dashboard | Backend metrics, function logs |
| WorkOS Dashboard | Authentication metrics, user activity |
| Uptime Robot / Pingdom | Health endpoint monitoring |
| Sentry | Error tracking (frontend + backend) |

### Log Access

```bash
# View recent Convex logs
npx convex logs --history 30

# Stream live logs
npx convex logs
```

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| `WORKOS_API_KEY must be configured` | Missing env vars | Verify `.env.local` has all WorkOS variables |
| `Deployment failed` | TypeScript errors | Run `npm run typecheck` and fix errors |
| Auth callback fails | Wrong redirect URI | Check WorkOS dashboard redirect URIs match `CONVEX_SITE_URL` |
| Health endpoint 404 | Convex not deployed | Run `npm run convex:deploy` |
| CORS errors | Missing allowed origin | Add origin to WorkOS AuthKit settings |
| Token refresh fails | Expired refresh token | User must re-authenticate |
| Frontend can't connect | Wrong `VITE_CONVEX_URL` | Verify env var matches deployment |
| Build fails | Dependency issues | Delete `node_modules` and run `npm install` |

### Debug Commands

```bash
# Check Convex deployment status
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json

# List available tables
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json

# View environment variables (masked)
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --masked

# Check recent logs
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=10 --json
```

## Security Considerations

### Production Checklist

- [ ] Use `sk_live_` WorkOS API key (not `sk_test_`)
- [ ] Enable HTTPS for all production URLs
- [ ] Configure Content Security Policy headers
- [ ] Review and restrict CORS allowed origins
- [ ] Enable audit logging for GDPR compliance
- [ ] Set up monitoring and alerting

### Sensitive Data

Never commit to version control:
- `.env.local` (contains secrets)
- WorkOS API keys
- Database credentials
- JWT signing keys

## Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [WorkOS AuthKit Documentation](https://workos.com/docs/user-management)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [OccuFlow Auth Architecture](../DOCUMENTS/AUTH.md)
