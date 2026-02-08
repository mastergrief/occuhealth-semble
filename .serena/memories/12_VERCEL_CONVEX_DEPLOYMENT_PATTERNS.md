# Vercel + Convex Deployment Patterns

## Environment Separation Architecture

Three-tier deployment for Vercel frontend + Convex backend.

### Environment Tiers

| Environment | Frontend | Backend | Auth Callback |
|-------------|----------|---------|---------------|
| **Production** | Vercel (gs-projects-0a558eaf) | exciting-herring-835 (EU West 1) | exciting-herring-835.eu-west-1.convex.site |
| **Dev/Preview** | Vercel preview / localhost | accurate-warbler-380 (EU West 1) | accurate-warbler-380.eu-west-1.convex.site |
| **Local** | localhost:5175 / 5176 | accurate-warbler-380 (EU West 1) | localhost redirect |

### Vercel Account

- **Account**: `m4stergr1ef@gmail.com` (slug: `m4stergr1ef-4279`, org: `gs-projects-0a558eaf`)
- **Project**: `convex-medical-starter`
- **Token**: `CLIENT_VERCEL_TOKEN` in `.env.local`
- **IMPORTANT**: `VERCEL_TOKEN` env var does NOT override global CLI auth — must use `--token` flag

### Key Environment Variables

**Frontend (Vercel dashboard):**
- `VITE_CONVEX_URL` — Convex deployment URL
- `VITE_WORKOS_CLIENT_ID` — WorkOS client ID

**Backend (Convex env vars):**
- `WORKOS_CLIENT_ID` — WorkOS client ID
- `WORKOS_API_KEY` — WorkOS API key (sk_test_*)
- `OPENAI_API_KEY` — GPT-5 Mini + RAG embeddings

### Convex CLI Commands

```bash
# Convex account: alt email, must `npx convex dev` to login
# Global auth — only one account at a time

# Local development (uses dev deployment)
npx convex dev

# Deploy to production
npx convex deploy

# Environment variables
npx convex env set VAR "value"        # Dev
npx convex env set VAR "value" --prod # Production
npx convex env list                   # Dev
npx convex env list --prod            # Production

# Seed admin on fresh deployment
npx convex run seedAdmin:seedAdmin '{"workosUserId":"...","email":"...","firstName":"...","lastName":"..."}'
```

### Vercel CLI Commands

```bash
# ALWAYS use --token flag (env var doesn't work with global auth)
TOKEN=$(grep CLIENT_VERCEL_TOKEN .env.local | cut -d= -f2)

# List deployments
vercel --token $TOKEN ls --yes

# Environment variables
vercel --token $TOKEN env ls
echo "value" | vercel --token $TOKEN env add VAR production
vercel --token $TOKEN env rm VAR production

# Deploy to production
vercel --token $TOKEN --prod --yes

# Inspect deployment
vercel --token $TOKEN inspect <deployment-url>
```

### Setup Checklist (Fresh Deployment)

1. **Convex Backend:**
   - [ ] Login to alt Convex account (`npx convex dev`)
   - [ ] Set env vars: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `OPENAI_API_KEY`
   - [ ] Seed admin user via `seedAdmin:seedAdmin`

2. **Vercel Frontend:**
   - [ ] Link project: `vercel --token $TOKEN ls --yes`
   - [ ] Set `VITE_CONVEX_URL` (production Convex URL)
   - [ ] Set `VITE_WORKOS_CLIENT_ID`
   - [ ] Deploy: `vercel --token $TOKEN --prod --yes`

3. **WorkOS Dashboard:**
   - [ ] Add dev redirect URI: `https://<dev-slug>.eu-west-1.convex.site/auth/callback`
   - [ ] Add prod redirect URI: `https://<prod-slug>.eu-west-1.convex.site/auth/callback`
   - [ ] Set dev as default redirect
   - [ ] Add localhost URIs for local dev

### CLI Gotchas

- **Vercel `--token` required** — `VERCEL_TOKEN` env var doesn't override global auth in current CLI version
- **Convex global auth** — only one account at a time, `npx convex logout` to switch
- **Convex deploy keys** — the `|eyJ...` tokens in `.env.local` are project-local but `npx convex dev` needs global login
- **Vercel `.vercel/` cache** — if linked to wrong account, delete `.vercel/` dir and re-link with correct token
- Values starting with `-----` (like PEM keys) fail via CLI — use Convex dashboard
- Vercel env vars apply after redeploy
- Use `echo "value" | vercel --token $TOKEN env add` for non-interactive
