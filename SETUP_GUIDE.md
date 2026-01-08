# OccuHealth Developer Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+
- Git

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd convex-medical-starter
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

| Variable | Description | Example |
|----------|-------------|---------|
| `CONVEX_DEPLOYMENT` | Convex deployment identifier | `dev:giddy-lapwing-915` |
| `VITE_CONVEX_URL` | Convex cloud URL | `https://<deployment>.convex.cloud` |
| `WORKOS_API_KEY` | WorkOS API secret key | `sk_test_...` |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client ID | `client_...` |
| `VITE_WORKOS_CLIENT_ID` | Same as above (for frontend) | `client_...` |

### 3. Start Development

```bash
npm run dev
```

This starts:
- Vite dev server on http://localhost:5175
- Convex dev backend with hot reloading
- TypeScript type checking in watch mode

### 4. Test Credentials (Development Only)

| Role | Email | Password |
|------|-------|----------|
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` |
| Admin | `testadmin@occuhealth.com` | `(TestPass1234` |

**Warning**: These are development-only credentials. Never use in production.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start full development environment |
| `npm run build` | Build for production |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright E2E tests |

## Common Issues

### Port Already in Use

```bash
# Kill process on port 5175
lsof -ti:5175 | xargs kill -9
```

### Convex Sync Fails

```bash
# Force re-sync Convex backend
npx convex dev --once
```

### TypeScript Errors After Install

```bash
# Clear TypeScript cache and re-check
rm -rf node_modules/.cache
npm run typecheck
```

### WorkOS Authentication Not Working

1. Verify `WORKOS_API_KEY` and `WORKOS_CLIENT_ID` are set in `.env.local`
2. Ensure `CONVEX_SITE_URL` points to your Convex HTTP actions URL
3. Check WorkOS dashboard for redirect URI configuration

## Project Structure

```
convex/                     # Backend (Convex functions)
  ├── schema.ts            # Database schema
  ├── http.ts              # HTTP routes (auth, webhooks)
  └── *Modules/            # Feature modules (facade pattern)
src/                        # Frontend (React + Vite)
  ├── components/          # UI components
  ├── pages/               # Route pages
  └── hooks/               # Custom React hooks
```

## Next Steps

- See [Testing Guide](./TESTING_GUIDE.md) for test instructions
- Check [README.md](./README.md) for API documentation
- Review `DOCUMENTS/AUTH.md` for authentication architecture
