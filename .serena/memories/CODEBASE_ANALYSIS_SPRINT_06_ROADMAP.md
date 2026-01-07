# Improvement Roadmap & Action Items
**Sprint**: 06 of 06
**Index**: CODEBASE_ANALYSIS_INDEX
**Depends On**: All previous sprints
**Next**: ✓ Final Sprint

---

## Priority Matrix

### 🔴 CRITICAL (Must Fix Before Production)

| Issue | Location | Impact | Effort | Action |
|-------|----------|--------|--------|--------|
| **Missing consent audit logs** | `convex/gdpr.ts:57-98` | GDPR violation | 30 min | Add `logAction()` to createConsent/withdrawConsent |
| **No data retention policy** | N/A (missing) | GDPR Art. 5(e) | 2 hrs | Create scheduled function to delete logs > 7 years |

### 🟠 HIGH (Should Fix This Sprint)

| Issue | Location | Impact | Effort | Action |
|-------|----------|--------|--------|--------|
| **0% employer portal tests** | `src/pages/employer/` | Quality risk | 4-6 hrs | Create test suite mirroring doctor tests |
| **0% admin portal tests** | `src/pages/admin/` | GDPR test gap | 4-6 hrs | Create test suite for GDPR pages |
| **availableSlots.ts monolith** | `convex/availableSlots.ts` | 659 lines | 2-4 hrs | Split into `availableSlotsModules/` |
| **Missing API documentation** | N/A | Dev friction | 4-6 hrs | Create `DOCUMENTS/API_REFERENCE.md` |

### 🟡 MEDIUM (Should Fix Next Sprint)

| Issue | Location | Impact | Effort | Action |
|-------|----------|--------|--------|--------|
| **EmployeeForm missing toast** | `src/components/employer/EmployeeForm.tsx:64` | UX gap | 15 min | Add toast.error() following BookingFlow pattern |
| **Dashboard multiple queries** | `src/pages/employer/Dashboard.tsx` | Performance | 1-2 hrs | Create aggregated dashboard endpoint |
| **JSDoc at 3.2%** | All Convex files | IDE support | 4-6 hrs | Add JSDoc to all exports |
| **Coverage config limited** | `vitest.config.ts` | False confidence | 15 min | Expand to all `src/` |

### 🟢 LOW (Nice to Have)

| Issue | Location | Impact | Effort | Action |
|-------|----------|--------|--------|--------|
| **No CSP headers** | `convex/http.ts` | Security hardening | 15 min | Add Content-Security-Policy |
| **myFunctions.ts legacy** | `convex/myFunctions.ts` | Dead code | 5 min | Delete file |
| **Console.log in http.ts** | `convex/http.ts` | Prod noise | 15 min | Remove or convert to debug |
| **Bundle optimization** | `vite.config.ts` | Load time | 1 hr | Add manualChunks |

---

## Sprint Execution Plan

### Sprint 7: Critical GDPR Fixes (2-3 hours)
```
□ Add audit logging to createConsent()
□ Add audit logging to withdrawConsent()
□ Configure CSP headers
□ Create GDPR compliance checklist document
```

### Sprint 8: Test Coverage (8-12 hours)
```
□ Create employer portal test suite (5 pages)
□ Create admin portal test suite (5 pages)
□ Expand vitest coverage config
□ Add coverage thresholds (70%+)
```

### Sprint 9: Code Quality (6-8 hours)
```
□ Split availableSlots.ts into modules
□ Add JSDoc to all Convex exports
□ Create API_REFERENCE.md
□ Fix EmployeeForm error toast
```

### Sprint 10: Performance (4-6 hours)
```
□ Create dashboard aggregation endpoint
□ Add data retention scheduler
□ Optimize Vite bundle config
□ Add React.memo to list components
```

---

## File-by-File Action Items

### convex/gdpr.ts (CRITICAL)
```typescript
// Line 57-70: createConsent
// ADD after successful insert:
await ctx.runMutation(internal.gdpr.logAction, {
  action: "consent_granted",
  actorType: "employer",
  resourceType: "consent",
  resourceId: consentId,
});

// Line 85-98: withdrawConsent
// ADD after successful update:
await ctx.runMutation(internal.gdpr.logAction, {
  action: "consent_withdrawn",
  actorType: "employer",
  resourceType: "consent",
  resourceId: args.consentId,
});
```

### src/components/employer/EmployeeForm.tsx (MEDIUM)
```typescript
// Line 64-65: Replace console.error with:
toast.error("Failed to add employee", {
  description: error instanceof ConvexError
    ? (error.data as string)
    : "An unexpected error occurred"
});
```

### vitest.config.ts (MEDIUM)
```typescript
// Expand coverage to all src:
coverage: {
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/*.test.{ts,tsx}'],
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 70,
  }
}
```

---

## Quick Wins (< 30 min each)

1. **Delete myFunctions.ts** - 5 min
   ```bash
   rm convex/myFunctions.ts
   ```

2. **Add CSP headers** - 15 min
   ```typescript
   // convex/http.ts - add to response headers
   "Content-Security-Policy": "default-src 'self'; ..."
   ```

3. **Expand coverage config** - 15 min
   - Edit vitest.config.ts

4. **Fix EmployeeForm toast** - 15 min
   - Edit src/components/employer/EmployeeForm.tsx

---

## Monitoring Checklist

### Before Production
```
Security
--------
☐ CRITICAL-G1 fixed (consent audit logs)
☐ CRITICAL-G3 fixed (retention policy)
☐ CSP headers configured
☐ JWT validation working ✓
☐ CSRF protection working ✓

Testing
-------
☐ Employer portal tests added
☐ Admin portal tests added
☐ Coverage thresholds passing
☐ E2E auth tests passing ✓

Documentation
-------------
☐ API reference created
☐ Deployment guide created
☐ JSDoc coverage improved
```

---

## Architecture Decisions Pending

### 1. availableSlots Module Split
**Current:** 659 lines monolith
**Proposed:**
```
convex/availableSlotsModules/
├── availableSlots.ts (facade, <100 lines)
├── queries.ts (~200 lines)
├── mutations.ts (~250 lines)
└── recurring.ts (~200 lines)
```

### 2. Dashboard Aggregation
**Current:** 3 parallel queries
**Proposed:** Single `getDashboardStats` endpoint

### 3. Data Export Endpoint
**For GDPR Article 15 compliance**
**Proposed:** `GET /api/export/my-data`

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Architecture Score | 8.5/10 | 9.0/10 |
| Security Score | 78/100 | 90/100 |
| Test Coverage | 27% | 70% |
| Documentation | 72% | 85% |
| GDPR Compliance | 75% | 95% |

---

## Conclusion

OccuHealth is **production-ready** after addressing:
1. ✅ 2 critical GDPR issues (consent logging, retention)
2. ✅ Test coverage for employer/admin portals
3. ✅ availableSlots.ts module split

The architecture is sound, the auth system is robust, and the codebase follows consistent patterns. Focus immediate effort on GDPR compliance, then expand test coverage.

---

✓ Final Sprint - Documentation Complete
