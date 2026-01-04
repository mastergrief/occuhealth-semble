# Documentation & Gaps: Auth System Coverage

**Sprint**: 06 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_02_ARCHITECTURE
**Next**: AUTH_ANALYSIS_SPRINT_07_REMEDIATION

---

## Documentation Coverage: 57%

---

## Well-Documented ✅

### Backend Authorization Guards
**File**: `convex/authModules/authorization.ts`
**Coverage**: 95%

Each function has comprehensive JSDoc:
- Purpose description
- Parameter documentation with types
- Return type documentation
- Error codes documented
- Usage examples

```typescript
/**
 * Verifies the current user has admin privileges.
 * @param ctx - The query/mutation context
 * @returns The admin user document
 * @throws ConvexError with code "UNAUTHENTICATED" if not logged in
 * @throws ConvexError with code "ADMIN_NOT_FOUND" if not an admin
 */
export async function requireAdmin(ctx: AuthContext): Promise<Doc<"adminUsers">>
```

### HTTP Endpoints
**File**: `convex/http.ts`
**Coverage**: 65%

- CSRF protection documented (SEC-002)
- JWT session ID extraction documented
- Role-based routing logic documented
- Cross-origin handling noted (SEC-001)

### NAV-MAP Reference
**File**: `.claude/rules/BROWSER-CLI/NAV-MAP.md`
**Coverage**: 90%

Complete route table with:
- Auth requirements per route
- Role restrictions
- Loading states
- Empty states

---

## Poorly Documented ⚠️

### Frontend Auth Context
**File**: `src/lib/workos-auth.tsx`
**Coverage**: 60%

**Missing**:
- No JSDoc on `WorkOSAuthProvider` component
- No JSDoc on `useWorkOSAuth()` base hook
- No documentation on `isTokenExpired()` function
- Sparse type definition comments

### Plan Document
**File**: `.serena/memories/PLAN_CONVEX_WORKOS_AUTH_INTEGRATION.md`
**Status**: OUTDATED

Plan describes Option B (ConvexProviderWithAuth) but actual implementation is Option A (WorkOS tokens only).

---

## Missing Documentation ❌

### API Specification
- No OpenAPI/Swagger spec
- No endpoint status codes table
- No error response examples
- No query parameter documentation

### Token Management
- No JWT claims structure documentation
- No token expiration strategy documented
- No refresh token behavior documented
- No session timeout documentation

### Error Handling Guide
- No error code → HTTP status mapping
- No frontend error handling patterns
- No re-authentication flow documentation
- No error recovery recommendations

### Security Posture
- No centralized security checklist
- No threat model documentation
- No attack mitigation summary

---

## Parity Check Results

| Dimension | Frontend | Backend | Status |
|-----------|----------|---------|--------|
| Storage Keys | STORAGE_KEYS constant | N/A | ⚠️ 1 hardcoded in AdminLayout |
| Error Codes | N/A | AuthErrorCode type | ✅ Consistent |
| Role Naming | UserRole type | Table names | ✅ Aligned |
| HTTP Routes | References | Definitions | ✅ Matching |
| Hook Naming | use[Role]Auth | require[Role] | ✅ Convention followed |

**Single Inconsistency**: `AdminLayout.tsx:80` hardcodes `"workos_admin_auth"` instead of using `STORAGE_KEYS["admin"]`.

---

## Documentation Gaps by Priority

### HIGH Priority
1. **OpenAPI Specification** - No machine-readable endpoint spec
2. **Token Refresh Strategy** - Not documented or implemented
3. **Error Handling Guide** - No frontend error handling docs
4. **Hook JSDoc** - useWorkOSAuth and provider undocumented

### MEDIUM Priority
5. **Guard Usage Patterns** - No composition examples
6. **Security Summary** - No centralized checklist
7. **State Transitions** - No auth state machine diagram

### LOW Priority
8. **Type Definition Comments** - Sparse TSDoc
9. **Migration Guide** - Plan vs implementation gap
10. **Rate Limiting Docs** - Future implementation

---

## Recommended New Documents

### DOCUMENTS/API.md
```markdown
# Auth API Reference

## Endpoints
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| /auth/login | GET | No | Initiate OAuth |
| /auth/callback | GET | No | Process OAuth return |
| /auth/logout | GET | No | End session |

## Error Responses
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHENTICATED | 401 | Not logged in |
| UNAUTHORIZED | 403 | Lacks permission |
```

### DOCUMENTS/TOKEN-MANAGEMENT.md
```markdown
# Token Management

## Storage Keys
- workos_admin_auth
- workos_employer_auth  
- workos_doctor_auth

## Token Lifecycle
1. Issued on OAuth callback
2. Stored in localStorage
3. Checked on page load (isTokenExpired)
4. Cleared on logout

## Expiration
- Access token: ~1 hour (WorkOS default)
- Refresh: NOT IMPLEMENTED
```

### DOCUMENTS/ERROR-HANDLING.md
```markdown
# Auth Error Handling

## Error Codes
| Code | Meaning | Recovery |
|------|---------|----------|
| UNAUTHENTICATED | Not logged in | Redirect to login |
| UNAUTHORIZED | Wrong role | Show access denied |
| EMPLOYER_NOT_FOUND | No employer record | Redirect to registration |
```

---

## Files Requiring JSDoc

| File | Functions | Priority |
|------|-----------|----------|
| `src/lib/workos-auth.tsx` | useWorkOSAuth, WorkOSAuthProvider, isTokenExpired | P1 |
| `convex/http.ts` | getWorkOS, route handlers | P2 |
| `convex/oauthState.ts` | create, validate, deleteState | P3 |

---

→ Next: AUTH_ANALYSIS_SPRINT_07_REMEDIATION
