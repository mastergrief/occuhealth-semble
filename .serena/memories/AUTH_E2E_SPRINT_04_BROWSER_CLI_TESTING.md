# Browser-CLI E2E Testing Guide

**Sprint**: 04 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: AUTH_E2E_SPRINT_02_BUG_ANALYSIS  
**Next**: AUTH_E2E_SPRINT_05_SECURITY_ASSESSMENT

---

## Browser-CLI Overview

Browser-CLI is a TCP-based Playwright wrapper for E2E testing with:
- Persistent auth state (`BROWSER-CLI/browser-state.json`)
- Named states (`BROWSER-CLI/states/<name>.json`)
- Rolling console buffer (100 messages)
- Network request capture (1000 requests)
- Auto-retry with exponential backoff

---

## Auth Testing Workflow

### Golden Pattern: Observe → Interact → Verify → Evidence

```bash
# 1. OBSERVE - Capture initial state
navigate localhost:5175
snapshot
screenshot landing.png

# 2. INTERACT - Perform auth action
click "text:Provider Login"
wait 2000  # WorkOS redirect
snapshot

# 3. VERIFY - Check results
console                    # Check for errors
network --filter=convex    # Verify API calls

# 4. EVIDENCE - Capture proof
screenshot result.png
```

---

## Auth Flow Testing Commands

### Test Login Flow
```bash
# Start fresh
navigate localhost:5175
snapshot

# Click login (redirects to WorkOS)
click "text:Provider Login"
# WorkOS auth happens externally
# After callback:
wait 2000
snapshot

# Verify authenticated state
console
assertNetwork employers:getByWorkosIdPublic
```

### Test Logout Flow
```bash
# Assuming authenticated state
restoreState authenticated-admin
navigate /admin
snapshot

# Perform logout
click "text:Sign Out"
wait 500
snapshot

# Verify logged out
console
# Check localStorage cleared
evaluate 'localStorage.getItem("workos_admin_auth")'
```

### Test Protected Routes
```bash
# Without auth - should redirect
navigate /admin
wait 1000
snapshot
# Should show login or redirect

# With broken auth
restoreState authenticated-employer
navigate /employer/dashboard
wait 1000
console  # Check for auth errors
```

---

## Saved Browser States

| State | Status | Issue |
|-------|--------|-------|
| `authenticated-admin` | ❌ BROKEN | Empty auth object |
| `authenticated-employer` | ❌ BROKEN | Empty tokens (BUG-001) |
| `authenticated-doctor` | ❌ NOT CREATED | BUG-003 blocked |
| `landing-page` | ✅ WORKS | Fresh landing |

### State Management Commands
```bash
saveState my-auth-state     # Save current state
restoreState my-auth-state  # Restore saved state
listStates                  # List all states
deleteState old-state       # Remove state
```

---

## Console Verification

### Expected Auth Logs
```
CONVEX Q(employers:getByWorkosIdPublic)   # Employer lookup
CONVEX Q(adminUsers:getByWorkosUserId)    # Admin lookup
CONVEX M(gdpr:createConsent)              # Registration consent
```

### Error Signatures (Bugs)
```
# BUG-001: Empty tokens
localStorage["workos_employer_auth"] = {"workosUserId":"","accessToken":""}

# BUG-002: Unauthorized admin access
ConvexError: {"code":"UNAUTHENTICATED"}  # Backend blocks

# BUG-003: Session persists
# No errors - just skips WorkOS login form
```

---

## Network Inspection

```bash
# View all Convex requests
network --filter=convex

# Check for failed requests
network --status=400
network --status=500

# Verify specific mutation
assertNetwork appointments:book
```

---

## Auth Testing Recipes

### Recipe 1: Test New User Registration
```bash
navigate localhost:5175
click "text:Provider Login"
# Complete WorkOS login externally
wait 3000
snapshot  # Should be at /register/choose-role

# Check for BUG-001 (empty tokens)
evaluate 'new URLSearchParams(location.search).get("accessToken")'
# If empty → BUG-001 confirmed

click "text:Employer"
wait 500
snapshot
# Fill registration form...
```

### Recipe 2: Test Admin Access Control
```bash
# Login as non-admin user
# (manually through WorkOS)
wait 2000

# Try accessing admin
navigate /admin
wait 1000
snapshot  # Should see admin UI (BUG-002)

# Check console for backend rejection
console
# Look for: ConvexError: UNAUTHENTICATED
```

### Recipe 3: Test Logout Completeness
```bash
restoreState authenticated-admin
navigate /admin
snapshot
screenshot before-logout.png

click "text:Sign Out"
wait 500
snapshot
screenshot after-logout.png

# Try re-login
navigate localhost:5175
click "text:Provider Login"
wait 2000
snapshot

# If at /register/choose-role without login form → BUG-003
```

---

## Selector Strategies for Auth

### Landing Page
```bash
click "text:Provider Login"        # Login button
click "text:Sign In"               # Alternative
```

### Admin Portal
```bash
click "text:Sign Out"              # Logout
click "text:Dashboard"             # Nav item
assert "text:Admin" visible        # Admin badge
```

### Employer Portal
```bash
click "text:Sign Out"              # Logout
assert "text:Account Pending Verification" visible  # Unverified state
```

---

## Testing Limitations

1. **Cannot clear WorkOS cookies** - Browser-CLI can't access cross-origin cookies
2. **localStorage.clear() blocked** - Security restriction
3. **Browser context persists** - States carry over
4. **External OAuth flow** - Can't automate WorkOS login form

### Workarounds
```bash
# Manual cookie clear in browser console (not via CLI)
# Or use incognito mode manually

# For testing logout:
# 1. Fix BUG-003 first
# 2. Or manually clear cookies in browser
```

---

## Evidence Files Generated

| File | Description | Bug |
|------|-------------|-----|
| `landing-page.png` | Landing with login | - |
| `workos-login.png` | WorkOS form | - |
| `choose-role.png` | Role selection | BUG-003 |
| `employer-dashboard.png` | Post-registration | BUG-001 |
| `admin-dashboard.png` | Admin access | BUG-002 |
| `before-logout.png` | Authenticated state | BUG-003 |
| `after-logout-session-persists.png` | Still auth'd | BUG-003 |

---

## Debug Commands

```bash
console                          # Browser console (last 5 auto-shown)
clearConsole                     # Clear buffer
network                          # All HTTP requests
network --filter=convex          # Convex only
snapshot --full                  # With element states
evaluate 'document.title'        # Read-only JS
```

---

→ Next: AUTH_E2E_SPRINT_05_SECURITY_ASSESSMENT
