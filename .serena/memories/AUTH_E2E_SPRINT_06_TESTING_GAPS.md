# Testing Gaps & Coverage Analysis

**Sprint**: 06 of 07  
**Index**: AUTH_E2E_INDEX  
**Depends On**: AUTH_E2E_SPRINT_02_BUG_ANALYSIS, AUTH_E2E_SPRINT_04_BROWSER_CLI_TESTING  
**Next**: AUTH_E2E_SPRINT_07_REMEDIATION_ROADMAP

---

## Current Test Coverage

| Category | Unit Tests | E2E Tests | Coverage |
|----------|------------|-----------|----------|
| Auth Hooks | 0 | Partial | CRITICAL GAP |
| OAuth Flow | 0 | Yes | LOW |
| Authorization Guards | 0 | No | CRITICAL GAP |
| Logout Flow | 0 | Partial | HIGH GAP |
| Token Validation | 0 | No | CRITICAL GAP |
| Multi-tab Sync | 0 | No | LOW GAP |

---

## Test Infrastructure

### Current Setup
```
Framework: Playwright only (E2E)
Config: /playwright.config.ts
Browsers: Chromium, Firefox, WebKit
Fixtures: /tests/e2e/fixtures/auth.fixture.ts
```

### Missing Infrastructure
```
❌ Unit test framework (Vitest/Jest not configured)
❌ Pre-commit hooks for tests
❌ Security-focused ESLint rules
❌ Code coverage reporting
❌ CI/CD test automation
```

---

## Critical Gaps: Zero Unit Tests

### 1. `isTokenExpired()` - NOT TESTED
```typescript
// workos-auth.tsx:83-90
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};
```

**Missing Test Cases:**
- Valid token not expired
- Valid token expired
- Malformed token (no dots)
- Empty token
- Invalid base64
- Missing exp claim
- Non-numeric exp claim

### 2. Authorization Guards - NOT TESTED
```typescript
// convex/authModules/authorization.ts
requireAdmin(ctx)
requireEmployerOwnership(ctx, employerId)
requireDoctorAccess(ctx)
getAuthenticatedUser(ctx)
```

**Missing Test Cases:**
- Authenticated user passes
- Unauthenticated user throws
- Wrong role throws
- Missing database record throws
- Ownership mismatch throws

### 3. OAuth State - NOT TESTED
```typescript
// convex/oauthState.ts
create()
validate()
deleteState()
```

**Missing Test Cases:**
- Create stores state
- Validate finds valid state
- Validate rejects expired state
- Validate rejects unknown state
- Delete removes state
- Replay attack prevented

---

## E2E Gaps (Bugs Not Covered)

| Bug | E2E Test? | Gap Description |
|-----|-----------|-----------------|
| BUG-001: Token Loss | ❌ NO | No test verifies tokens pass through registration |
| BUG-002: Admin UI | ⚠️ PARTIAL | Tests routing, not API rejection |
| BUG-003: Session Persist | ❌ NO | Only tests localStorage cleanup |

---

## Mocking Strategy Analysis

### Current (E2E Only)
```typescript
// Bypasses real auth entirely
await page.evaluate(() => {
  localStorage.setItem('workos_admin_auth', JSON.stringify({
    userId: 'test_admin',
    accessToken: 'fake.jwt.token',
  }));
});
```

**Limitations:**
- Cannot test OAuth callback
- Cannot test backend token validation
- Cannot test WorkOS SDK errors
- Cannot test multi-tab behavior

### Recommended Mocking
```typescript
// Mock WorkOS SDK for unit tests
const mockWorkOS = {
  userManagement: {
    getAuthorizationUrl: jest.fn(() => 'https://mock.workos.com/authorize'),
    authenticateWithCode: jest.fn(() => ({
      user: { id: 'test_user' },
      accessToken: 'mock.jwt.token',
      refreshToken: 'mock.refresh',
    })),
    getLogoutUrl: jest.fn(() => 'https://mock.workos.com/logout'),
  },
};
```

---

## Recommended Test Cases

### Unit Tests (25+)

**isTokenExpired() - 5 cases**
```
✓ returns false for valid unexpired token
✓ returns true for valid expired token
✓ returns true for malformed token
✓ returns true for empty string
✓ returns true for missing exp claim
```

**WorkOSAuthProvider - 9 cases**
```
✓ initializes from localStorage
✓ ignores expired tokens
✓ handles corrupted localStorage
✓ login stores tokens correctly
✓ logout clears tokens
✓ multi-tab sync on login
✓ multi-tab sync on logout
✓ normalizes admin userId field
✓ provides correct hook values
```

**Authorization Guards - 7 cases**
```
✓ requireAdmin passes for admin
✓ requireAdmin throws for non-admin
✓ requireEmployerOwnership passes for owner
✓ requireEmployerOwnership throws for non-owner
✓ requireDoctorAccess passes for doctor
✓ requireDoctorAccess throws for non-doctor
✓ getAuthenticatedUser returns null for unauthenticated
```

**OAuth State - 4 cases**
```
✓ create stores state with TTL
✓ validate returns valid state
✓ validate returns null for expired
✓ deleteState removes state
```

### E2E Tests (13+)

**OAuth Callback - 4 cases**
```
✓ redirects to portal for existing user
✓ redirects to choose-role for new user
✓ handles invalid state gracefully
✓ handles missing code gracefully
```

**Session Persistence - 3 cases**
```
✓ tokens persist across page reload
✓ tokens sync across tabs
✓ expired tokens are auto-cleaned
```

**Cross-tab Sync - 2 cases**
```
✓ login in tab A updates tab B
✓ logout in tab A updates tab B
```

**Logout Flow - 2 cases**
```
✓ logout clears localStorage
✓ logout terminates WorkOS session
```

**API Rejection - 2 cases**
```
✓ admin route rejects non-admin
✓ employer route rejects non-owner
```

---

## Quality Infrastructure Gaps

| Tool | Status | Recommendation |
|------|--------|----------------|
| TypeScript | ✅ STRICT | Keep strict: true |
| ESLint | ⚠️ RELAXED | Add security plugin |
| Pre-commit | ❌ MISSING | Add husky hooks |
| Vitest/Jest | ❌ MISSING | Add for unit tests |
| Coverage | ❌ MISSING | Add c8/istanbul |

---

## Immediate Testing Actions

### Priority 1: Add Unit Test Framework
```bash
npm install -D vitest @testing-library/react
```

### Priority 2: Test isTokenExpired()
Highest ROI - security-critical, simple to test

### Priority 3: Test Authorization Guards
Critical for security, requires Convex test setup

### Priority 4: Add E2E Tests for Bugs
Regression tests for BUG-001, BUG-002, BUG-003

---

→ Next: AUTH_E2E_SPRINT_07_REMEDIATION_ROADMAP
