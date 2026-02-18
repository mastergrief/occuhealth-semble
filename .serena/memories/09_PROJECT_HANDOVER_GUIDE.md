# OccuFlow Project Handover Guide

## Overview

This guide covers transferring the OccuFlow platform to the doctor client, including hosting accounts, data migration, and ongoing maintenance options.

---

## Handover Options

### Option A: Developer Maintains, Doctor Owns Hosting (Recommended)

```
Doctor Owns                    Developer Retains
────────────                   ─────────────────
✓ Convex account               ✓ Git repository
✓ Vercel account               ✓ Development environment
✓ Domain (if any)              ✓ Ability to push updates
✓ WorkOS account               
✓ All credentials              
✓ Data ownership               
```

**Benefits**:
- Clean ICO separation (doctor is data controller, no data processor needed)
- Doctor has full ownership of their business assets
- Developer can push updates without account access complexity
- Clear billing separation
- Developer not liable for data

**Ongoing Arrangement**:
- Doctor pays Convex/Vercel/domain bills directly
- Developer bills for maintenance/updates separately
- Developer pushes to doctor's Vercel via deploy token or granted access

### Option B: Full Handover (Developer Exits Completely)

```
Doctor Receives Everything
──────────────────────────
✓ Convex account
✓ Vercel account
✓ Domain (if any)
✓ WorkOS account
✓ Source code (zip backup)
✓ Documentation
✗ Developer involvement ends
```

**Benefits**:
- Complete independence
- Doctor can hire any developer later
- No ongoing relationship required

**Drawbacks**:
- Doctor needs technical help for any changes
- Must find new developer if issues arise

---

## Migration Procedure

### Phase 1: Account Setup (Doctor's Side)

| Account | URL | Action |
|---------|-----|--------|
| Convex | convex.dev | Doctor creates account, creates new project |
| Vercel | vercel.com | Doctor creates account |
| WorkOS | workos.com | Transfer or create in doctor's name |
| Domain | registrar | Transfer ownership if applicable |

### Phase 2: Convex Migration

```bash
# 1. Export from current project
npx convex export --path occuflow-backup.zip

# 2. Get new project credentials from doctor's Convex dashboard
#    - New CONVEX_DEPLOYMENT URL
#    - New deploy key

# 3. Update local .env.local with new project URL
CONVEX_DEPLOYMENT=https://doctors-project-123.convex.cloud

# 4. Deploy schema and functions to new project
npx convex deploy

# 5. Import data to new project
npx convex import --path occuflow-backup.zip

# 6. Verify data migrated
npx convex dashboard
```

### Phase 3: Environment Variables

Set in doctor's Convex dashboard (Settings → Environment Variables):

| Variable | Value | Notes |
|----------|-------|-------|
| WORKOS_API_KEY | sk_live_... | From WorkOS dashboard |
| WORKOS_CLIENT_ID | client_... | From WorkOS dashboard |
| WORKOS_REDIRECT_URI | New Convex URL + callback | Update in WorkOS too |
| SITE_URL | Production URL | Vercel domain |

### Phase 4: Vercel Deployment

```bash
# Option 1: Doctor grants developer access to their Vercel
# - Doctor invites developer to project
# - Developer can deploy via CLI

# Option 2: Doctor deploys themselves (with guidance)
# - Connect to Git repo (if transferred)
# - Or manual deploy via Vercel CLI

# Option 3: Deploy token
# - Doctor creates deploy token in Vercel settings
# - Developer uses token for CI/CD
```

**Vercel Environment Variables** (doctor's dashboard):

| Variable | Value |
|----------|-------|
| VITE_CONVEX_URL | Doctor's new Convex deployment URL |
| VITE_WORKOS_CLIENT_ID | WorkOS client ID |

### Phase 5: WorkOS Configuration

Update redirect URIs in WorkOS dashboard:

```
Old: https://old-project.convex.site/auth/callback
New: https://doctors-project.convex.site/auth/callback

Old: http://localhost:5175/auth/callback (keep for dev)
New: https://doctors-domain.com/auth/callback (production)
```

### Phase 6: DNS & Domain (If Applicable)

| Record | Type | Value |
|--------|------|-------|
| @ | A | Vercel IP |
| www | CNAME | cname.vercel-dns.com |

---

## Handover Checklist

### Accounts Created/Transferred
- [ ] Convex account in doctor's name
- [ ] Convex project created
- [ ] Vercel account in doctor's name
- [ ] Vercel project created
- [ ] WorkOS ownership confirmed
- [ ] Domain transferred (if applicable)

### Data Migration
- [ ] Convex data exported from old project
- [ ] Convex data imported to new project
- [ ] Data integrity verified (spot check records)
- [ ] File storage migrated (if any uploads)

### Configuration
- [ ] Convex environment variables set
- [ ] Vercel environment variables set
- [ ] WorkOS redirect URIs updated
- [ ] DNS configured (if custom domain)
- [ ] SSL certificate active

### Testing
- [ ] Landing page loads
- [ ] Doctor can log in
- [ ] Employer can log in
- [ ] Booking flow works
- [ ] Reports accessible
- [ ] All portal navigation functional

### Documentation Delivered
- [ ] Login credentials document (secure delivery)
- [ ] Source code backup (zip file)
- [ ] This handover guide
- [ ] Basic troubleshooting FAQ

---

## Credentials Document Template

Deliver securely (encrypted email, password manager share, or in-person):

```
OCCUFLOW PLATFORM CREDENTIALS
================================
Date: [DATE]
Prepared for: Dr. [NAME]

CONVEX
------
Dashboard: https://dashboard.convex.dev
Email: [doctor's email]
Password: [set by doctor]
Project: [project name]
Deployment URL: https://[project].convex.cloud

VERCEL
------
Dashboard: https://vercel.com
Email: [doctor's email]
Password: [set by doctor]
Project: [project name]
Production URL: https://[domain or vercel URL]

WORKOS
------
Dashboard: https://dashboard.workos.com
Email: [doctor's email]
Password: [set by doctor]
Client ID: client_[...]
API Key: sk_live_[...] (DO NOT SHARE)

DOMAIN (if applicable)
------
Registrar: [e.g., Namecheap, GoDaddy]
Domain: [domain.com]
Login: [doctor's email]
Password: [set by doctor]

SUPPORT CONTACT
---------------
Developer: [your name]
Email: [your email]
Maintenance terms: [e.g., "Contact for quote"]
```

---

## Option A: Ongoing Maintenance Setup

If developer maintains while doctor owns hosting:

### Access Requirements

| Service | Access Level | How |
|---------|--------------|-----|
| Convex | Deploy access | Doctor adds developer to team |
| Vercel | Deploy access | Doctor adds developer to project |
| Git | Full (developer owns) | No change needed |
| WorkOS | View only (optional) | For debugging auth issues |

### Deployment Workflow

```bash
# Developer makes changes locally
git add . && git commit -m "Update feature X"

# Deploy to doctor's Convex
npx convex deploy

# Vercel auto-deploys if connected to Git
# OR manual deploy via Vercel CLI
vercel --prod
```

### Maintenance Agreement Terms (Suggested)

| Item | Terms |
|------|-------|
| Response time | Within 48 hours for non-critical |
| Emergency support | Same-day for platform down |
| Hourly rate | £[X]/hour |
| Monthly retainer (optional) | £[X]/month for Y hours |
| Included | Bug fixes, minor updates |
| Extra | New features, major changes |

---

## Troubleshooting FAQ (For Doctor)

**Q: The site is down**
A: Check Vercel status (vercel.com/status) and Convex status. Contact developer if persists.

**Q: Users can't log in**
A: Check WorkOS dashboard for errors. Redirect URI may need updating.

**Q: I need to change something**
A: Contact developer for quote. Do not attempt to edit code without developer.

**Q: How do I check costs?**
A: Convex dashboard → Settings → Usage. Vercel dashboard → Usage.

**Q: I want to switch developers**
A: Source code backup provided. New developer can take over with full access.

---

## Cost Expectations (Doctor's Ongoing)

| Service | Free Tier | Paid Estimate |
|---------|-----------|---------------|
| Convex | Generous free tier | ~$25/mo if exceeded |
| Vercel | Hobby free, Pro $20/mo | $0-20/mo |
| WorkOS | Free up to 1M users | $0 |
| Domain | N/A | ~£10-15/year |

**Total estimated**: £0-40/month depending on usage

---

## Final Handover Sign-Off

```
HANDOVER COMPLETION CONFIRMATION
================================

Project: OccuFlow
Date: _______________

I confirm receipt of:
[ ] All account credentials
[ ] Source code backup
[ ] Documentation
[ ] Verified platform functionality

Doctor Signature: _________________
Date: _______________

Developer Signature: _________________
Date: _______________

Maintenance arrangement: [ ] Option A (ongoing) / [ ] Option B (complete handover)
```
