# Browser-CLI E2E Testing: Auth Flows

**Sprint**: 05 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_04_TESTING
**Next**: AUTH_ANALYSIS_SPRINT_06_DOCUMENTATION

---

## Browser-CLI Auth Testing Capabilities

Browser-CLI provides automated browser testing via TCP daemon (port 3456) with Playwright backend.

---

## Pre-Saved Auth States

| State Name | Description | Storage Location |
|------------|-------------|------------------|
| `authenticated-admin` | Admin with WorkOS tokens | `BROWSER-CLI/states/authenticated-admin.json` |
| `authenticated-employer` | Employer with tokens | `BROWSER-CLI/states/authenticated-employer.json` |
| `landing-page` | Fresh unauthenticated | `BROWSER-CLI/states/landing-page.json` |

### State Structure
```json
{
  "url": "http://localhost:5175/",
  "cookies": [...],
  "localStorage": {
    "workos_admin_auth": "{\"userId\":\"...\",\"accessToken\":\"...\",\"sessionId\":\"...\"}"
  },
  "sessionStorage": "{}"
}
```

---

## Auth Testing Commands

### Quick Start (Skip OAuth)
```bash
# Restore authenticated state
restoreState authenticated-admin
navigate /admin
wait 500
snapshot  # Verify dashboard loads

# Save new auth state after manual login
saveState my-new-admin
```

### OAuth Flow Testing
```bash
# Navigate to landing page
navigate localhost:5175
snapshot

# Click Provider Login (floating button)
click "text:Provider Login"
# → Redirects to WorkOS

# After WorkOS auth, callback routes to:
#   /admin, /employer/dashboard, /doctor/dashboard, or /register/choose-role
```

### Login Button Verification
```bash
# Verify login button points to WorkOS
navigate /
snapshot
evaluate 'document.querySelector("a[href*=workos]")?.href'
# Should return WorkOS authorization URL
```

### Logout Flow Testing
```bash
restoreState authenticated-admin
navigate /admin
snapshot  # Verify logged in

click "text:Sign Out"
wait 1000
snapshot  # Should be on landing page

# Verify localStorage cleared
evaluate 'localStorage.getItem("workos_admin_auth")'
# Should return null
```

---

## Protected Route Testing

### Test Admin Routes
```bash
restoreState authenticated-admin
navigate /admin
wait 500
snapshot
assert "text:Dashboard" visible

navigate /admin/employers
wait 500
snapshot
assert "text:Employers" visible

navigate /admin/gdpr
wait 500
snapshot
assert "text:GDPR" visible
```

### Test Employer Routes
```bash
restoreState authenticated-employer
navigate /employer/dashboard
wait 500
snapshot
assert "text:Dashboard" visible

navigate /employer/employees
wait 500
snapshot
# May show "No employees added yet" for empty state
```

### Test Route Guards (Unauthorized)
```bash
# Test admin route without auth
restoreState landing-page
navigate /admin
wait 1000
snapshot
# Should show "Admin Access Required" or redirect to login
```

---

## Multi-Tab Auth Testing

Browser-CLI doesn't natively support multi-tab sync testing, but can simulate:

```bash
# Tab 1: Login
restoreState authenticated-admin
navigate /admin
snapshot  # Confirm logged in

# Simulate storage event (another tab logged out)
evaluate 'localStorage.removeItem("workos_admin_auth"); window.dispatchEvent(new StorageEvent("storage", {key: "workos_admin_auth", newValue: null}))'

wait 500
snapshot  # Should detect logout and redirect
```

---

## Token Expiration Testing

```bash
# Inject expired token
evaluate '(() => {
  const header = btoa(JSON.stringify({alg: "HS256"}));
  const body = btoa(JSON.stringify({exp: Math.floor(Date.now()/1000) - 3600}));
  const token = header + "." + body + ".sig";
  localStorage.setItem("workos_admin_auth", JSON.stringify({
    userId: "test", accessToken: token, sessionId: "test"
  }));
})()'

navigate /admin
wait 1000
snapshot  # Should redirect to login (token expired)
```

---

## Console & Network Verification

```bash
# After auth action
snapshot
console  # Check for auth errors

# Verify Convex queries
network --filter=convex
# Expected: CONVEX Q(employers:getByWorkosIdPublic)

# Verify no auth failures
assertConsole --level=error
network --status=401  # Should be empty
```

---

## Auth Test Scenarios

### Scenario 1: Full Login Flow
```bash
# 1. Start fresh
navigate localhost:5175
wait 500
snapshot  # Landing page

# 2. Verify login button
assert "text:Provider Login" visible

# 3. Note: Can't test actual OAuth (external redirect)
# Instead, inject auth state
restoreState authenticated-admin
navigate /admin
snapshot
assert "text:Dashboard" visible
```

### Scenario 2: Session Persistence
```bash
# 1. Restore auth
restoreState authenticated-admin
navigate /admin
snapshot

# 2. Reload page
navigate /admin
wait 500
snapshot
assert "text:Dashboard" visible  # Still logged in
```

### Scenario 3: Logout Complete
```bash
# 1. Start logged in
restoreState authenticated-admin
navigate /admin
snapshot

# 2. Logout
click "text:Sign Out"
wait 1500  # WorkOS redirect

# 3. Verify logged out
snapshot
evaluate 'localStorage.getItem("workos_admin_auth")'
# → null
```

### Scenario 4: Role-Based Access
```bash
# Test employer can't access admin
restoreState authenticated-employer
navigate /admin
wait 1000
snapshot
# Should NOT show admin dashboard
# Should show access denied or redirect
```

---

## Known Limitations

1. **Cannot test actual OAuth flow** - WorkOS is external
2. **Tokens in saved states expire** - Must refresh periodically
3. **Multi-tab testing limited** - Single browser context
4. **Token refresh not testable** - Not implemented in app

---

## Storage Key Reference

| Role | localStorage Key |
|------|-----------------|
| Admin | `workos_admin_auth` |
| Employer | `workos_employer_auth` |
| Doctor | `workos_doctor_auth` |

---

## Route Reference for Auth Testing

| Route | Auth Required | Role | Expected Behavior |
|-------|--------------|------|-------------------|
| `/` | No | - | Landing page |
| `/auth/callback` | No | - | Process OAuth tokens |
| `/admin` | Yes | admin | Dashboard or access denied |
| `/admin/employers` | Yes | admin | Employer list |
| `/admin/gdpr` | Yes | admin | GDPR dashboard |
| `/employer/dashboard` | Yes | employer | Employer dashboard |
| `/doctor/dashboard` | Yes | doctor | Doctor dashboard |

---

→ Next: AUTH_ANALYSIS_SPRINT_06_DOCUMENTATION
