# Doctor Portal - Sprint Index

**Created**: 2026-01-04
**Total Sprints**: 6
**Total Words**: ~4,000
**Scope**: Complete Doctor Portal remediation (routing, security, testing, documentation)

---

## Executive Summary

The Doctor Portal exploration identified a **critical routing bug (ROUTE-001)** that blocks all page content, plus **5 security vulnerabilities**, **zero error handling**, and **45% documentation coverage**. This sprint series provides a structured remediation path.

| Priority | Sprints | Effort | Impact |
|----------|---------|--------|--------|
| P0 Critical | 01, 02 | 4-7 hrs | Unblocks portal, fixes security |
| P1 High | 03, 04, 05 | 16-24 hrs | UX, testing, verification |
| P2 Medium | 06 | 4-6 hrs | Documentation, polish |

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | [DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX](#sprint-01) | ~700 | Pending | None |
| 02 | [DOCTOR_PORTAL_SPRINT_02_SECURITY](#sprint-02) | ~800 | Pending | 01 |
| 03 | [DOCTOR_PORTAL_SPRINT_03_ERROR_HANDLING](#sprint-03) | ~700 | Pending | 01 |
| 04 | [DOCTOR_PORTAL_SPRINT_04_TESTING](#sprint-04) | ~600 | Pending | 01, 02 |
| 05 | [DOCTOR_PORTAL_SPRINT_05_BROWSER_TESTING](#sprint-05) | ~700 | Pending | 01, 04 |
| 06 | [DOCTOR_PORTAL_SPRINT_06_DOCUMENTATION](#sprint-06) | ~500 | Pending | 01-05 |

---

## Reading Order

### Critical Path (Must Complete)
1. **DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX** - Fix DoctorLayout Routes block
2. **DOCTOR_PORTAL_SPRINT_02_SECURITY** - Fix 5 authorization vulnerabilities

### High Priority (Should Complete)
3. **DOCTOR_PORTAL_SPRINT_03_ERROR_HANDLING** - Add try/catch, loading states
4. **DOCTOR_PORTAL_SPRINT_04_TESTING** - Vitest setup, unit tests
5. **DOCTOR_PORTAL_SPRINT_05_BROWSER_TESTING** - Browser-CLI E2E tests

### Nice to Have
6. **DOCTOR_PORTAL_SPRINT_06_DOCUMENTATION** - JSDoc, README, polish

---

## Topic Cross-Reference

### Routing Architecture
- Sprint 01: DoctorLayout Routes block fix
- Sprint 05: Route verification via browser testing

### Security
- Sprint 02: Authorization fixes for 4 mutations
- Sprint 02: Zoom URL validation
- Sprint 04: Security unit tests

### Error Handling
- Sprint 03: Mutation error patterns
- Sprint 03: Loading states
- Sprint 03: Form validation

### Testing
- Sprint 04: Vitest framework setup
- Sprint 04: Unit test patterns
- Sprint 05: Browser-CLI commands
- Sprint 05: E2E test suites (T1-T7)

### Documentation
- Sprint 06: Type definitions
- Sprint 06: JSDoc templates
- Sprint 06: README creation
- Sprint 06: data-testid attributes

---

## Files Affected by Sprint

| Sprint | Files Modified |
|--------|----------------|
| 01 | `src/pages/DoctorLayout.tsx` |
| 02 | `convex/availableSlots.ts`, `convex/doctorSettings.ts` |
| 03 | All 5 doctor page components |
| 04 | `vitest.config.ts`, `tests/setup.ts`, test files |
| 05 | Browser-CLI states, screenshots |
| 06 | `src/types/doctor.ts`, README files, all components (JSDoc) |

---

## Dependency Graph

```
Sprint 01 (Routing) ─────────────────────────────────┐
    │                                                │
    ├──► Sprint 02 (Security) ───────────────────────┤
    │         │                                      │
    │         └──────────────► Sprint 04 (Testing) ──┤
    │                              │                 │
    ├──► Sprint 03 (Error Handling)│                 │
    │                              │                 │
    │         ┌────────────────────┘                 │
    │         │                                      │
    └──► Sprint 05 (Browser Testing) ◄───────────────┤
                   │                                 │
                   └──────────────► Sprint 06 (Docs) ┘
```

---

## Verification Checklist

After completing all sprints:

- [ ] `npm run typecheck` passes
- [ ] `npm run dev` starts without errors
- [ ] Navigate to `/doctor/dashboard` shows content
- [ ] All 5 doctor pages render correctly
- [ ] Browser-CLI tests T1-T7 pass
- [ ] Unit tests pass with 80%+ coverage
- [ ] No console errors on any page
- [ ] Documentation coverage at 95%

---

## Quick Start

### For Developers
```bash
# Read sprints in order
read_memory("DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX")
read_memory("DOCTOR_PORTAL_SPRINT_02_SECURITY")
# ... continue through 06
```

### For Browser Testing
```bash
restoreState authenticated-doctor
navigate /doctor/dashboard
wait 1000
snapshot
```

### For Typecheck
```bash
npm run typecheck
```

---

## Related Documentation

- `AUDIT_REPORT_DOCTOR_PORTAL_20260104` - Original audit findings
- `NAV-MAP.md` - Route documentation and selectors
- `00_PROJECT_OVERVIEW` - Project context
- `04_ARCHITECTURE` - System architecture

---

## Sprint Status Tracking

Update this section as sprints complete:

```
[ ] Sprint 01: Routing Fix
[ ] Sprint 02: Security
[ ] Sprint 03: Error Handling
[ ] Sprint 04: Testing Strategy
[ ] Sprint 05: Browser Testing
[ ] Sprint 06: Documentation
```

---

## Estimated Timeline

| Sprint | Solo Dev | With Review |
|--------|----------|-------------|
| 01 | 2 hrs | 3 hrs |
| 02 | 2 hrs | 4 hrs |
| 03 | 4 hrs | 6 hrs |
| 04 | 6 hrs | 10 hrs |
| 05 | 4 hrs | 6 hrs |
| 06 | 4 hrs | 6 hrs |
| **Total** | **22 hrs** | **35 hrs** |

---

## Support

For questions about this sprint series:
- Check `AUDIT_REPORT_DOCTOR_PORTAL_20260104` for original findings
- Review 12-agent exploration output in conversation history
- Run browser agent for live verification
