# REMEDIATION - Sprint Index

**Created**: 2026-01-07T00:00:00Z
**Total Sprints**: 4
**Total Words**: ~2,450
**Scope**: Top 3 codebase analysis remediation items + browser-cli verification testing
**Source**: 12-Agent Parallel Codebase Analysis (2026-01-07)

---

## Executive Summary

This sprint series addresses the **top 3 remediation items** identified during the comprehensive codebase analysis, plus end-to-end verification testing using Browser-CLI.

| Priority | Issue | Sprint | Effort | Status |
|----------|-------|--------|--------|--------|
| P1-IMMEDIATE | Employer booking verification gap | 01 | 15 min | Pending |
| P1-SHORT_TERM | gdpr.ts monolith (651 lines) | 02 | 2-3 hrs | Pending |
| P2-MEDIUM_TERM | GDPR Article 20 compliance | 03 | 4 hrs | Pending |
| P1-VERIFICATION | Browser-CLI manual testing | 04 | 1-2 hrs | Pending |

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | REMEDIATION_SPRINT_01_EMPLOYER_BOOKING_FIX | ~450 | Pending | None |
| 02 | REMEDIATION_SPRINT_02_GDPR_MODULE_SPLIT | ~850 | Pending | None |
| 03 | REMEDIATION_SPRINT_03_DATA_EXPORT | ~650 | Pending | 02 |
| 04 | REMEDIATION_SPRINT_04_BROWSER_CLI_TESTING | ~550 | Pending | 01, 02, 03 |

---

## Reading Order

### Critical Path (Recommended)
1. **Sprint 01** - Employer Booking Fix (15 min) ← START HERE
2. **Sprint 02** - GDPR Module Split (2-3 hrs)
3. **Sprint 03** - Data Export Feature (4 hrs)
4. **Sprint 04** - Browser-CLI Testing (1-2 hrs) ← VERIFICATION

### Parallel Execution (Faster)
- Sprint 01 and Sprint 02 can run in parallel (no dependencies)
- Sprint 03 depends on Sprint 02 completion
- Sprint 04 runs after all implementation sprints

---

## Topic Cross-Reference

| Topic | Sprint(s) | Notes |
|-------|-----------|-------|
| **Security** | 01 | Backend authorization enforcement |
| **GDPR Compliance** | 02, 03 | Module refactor + Article 20 |
| **Code Architecture** | 02 | Facade pattern, module splitting |
| **Testing** | 04 | Browser-CLI E2E verification |
| **Convex Backend** | 01, 02, 03 | Mutations, queries, module structure |
| **Admin Portal** | 03, 04 | Data export UI, GDPR dashboard |
| **Employer Portal** | 01, 04 | Booking flow |

---

## Sprint Details

### Sprint 01: Employer Booking Verification Fix
**File**: `REMEDIATION_SPRINT_01_EMPLOYER_BOOKING_FIX`
**Priority**: P1-IMMEDIATE
**Type**: Security Fix
**Location**: `convex/appointments.ts`
**Change**: Add `employer.status === "verified"` check before booking

### Sprint 02: GDPR Module Split
**File**: `REMEDIATION_SPRINT_02_GDPR_MODULE_SPLIT`
**Priority**: P1-SHORT_TERM
**Type**: Architecture Refactor
**Location**: `convex/gdpr.ts` → `convex/gdprModules/`
**Pattern**: Facade pattern (same as availableSlotsModules)

### Sprint 03: GDPR Data Export
**File**: `REMEDIATION_SPRINT_03_DATA_EXPORT`
**Priority**: P2-MEDIUM_TERM
**Type**: New Feature
**Location**: `convex/gdprModules/export.ts`
**Compliance**: GDPR Article 20 (Right to data portability)

### Sprint 04: Browser-CLI Testing
**File**: `REMEDIATION_SPRINT_04_BROWSER_CLI_TESTING`
**Priority**: P1-VERIFICATION
**Type**: Manual Testing Protocol
**Tool**: `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts`
**Coverage**: All 3 implementation sprints

---

## Success Criteria

### Implementation Complete When:
- [ ] Sprint 01: Unverified employers rejected at backend
- [ ] Sprint 02: gdpr.ts < 50 lines, all functions in gdprModules/
- [ ] Sprint 03: exportPatientData query returns complete data
- [ ] Sprint 04: All Browser-CLI tests pass with evidence

### Evidence Required:
- Screenshots of booking flow (pending vs verified)
- Screenshot of GDPR dashboard post-refactor
- JSON export sample
- Console output showing no errors

---

## Estimated Timeline

| Phase | Duration | Sprints |
|-------|----------|---------|
| Day 1 (2 hrs) | Sprint 01 + Sprint 02 | Implementation |
| Day 2 (4 hrs) | Sprint 03 | Feature development |
| Day 2 (2 hrs) | Sprint 04 | Verification |
| **Total** | **8 hours** | All sprints |

---

## Related Memories

- `SECURITY_CROSS_VERIFICATION_2026-01-07` - Security analysis findings
- `CODEBASE_ANALYSIS_SPRINT_02_ARCHITECTURE` - Architecture patterns
- `04_ARCHITECTURE` - System architecture reference
- `TESTING_INFRASTRUCTURE_ANALYSIS_2026-01-07` - Testing patterns

---

## Completion Tracking

```
[ ] Sprint 01 - Employer Booking Fix
[ ] Sprint 02 - GDPR Module Split
[ ] Sprint 03 - Data Export Feature
[ ] Sprint 04 - Browser-CLI Testing
[ ] All evidence collected
[ ] Index updated with completion status
```

---

**Last Updated**: 2026-01-07
**Status**: Ready for Execution
