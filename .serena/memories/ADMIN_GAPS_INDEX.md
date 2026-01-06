# ADMIN_GAPS - Sprint Index

**Created**: 2026-01-06T12:30:00Z
**Total Sprints**: 6
**Total Words**: ~4,500
**Scope**: Admin Portal Gaps Analysis & Implementation Plan (from 12-agent EXPLORE)

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY | ~500 | Pending | None |
| 02 | ADMIN_GAPS_SPRINT_02_SECURITY | ~700 | Pending | 01 |
| 03 | ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION | ~900 | Pending | 01 |
| 04 | ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION | ~700 | Pending | 01 |
| 05 | ADMIN_GAPS_SPRINT_05_MANUAL_TESTING | ~1100 | Pending | 03, 04 |
| 06 | ADMIN_GAPS_SPRINT_06_TESTING_DOCS | ~600 | Pending | All |

---

## Reading Order

### Implementation Path
1. **ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY** - Start here for architecture overview
2. **ADMIN_GAPS_SPRINT_02_SECURITY** - Critical GDPR compliance fixes (do first)
3. **ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION** - Appointment types edit/delete, rejection reason
4. **ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION** - Dark mode, mobile nav, filter UI
5. **ADMIN_GAPS_SPRINT_05_MANUAL_TESTING** - Browser-CLI test procedures
6. **ADMIN_GAPS_SPRINT_06_TESTING_DOCS** - Unit tests and documentation updates

### Quick Reference Path
- Security issues only → Sprint 02
- CRUD gaps only → Sprint 03
- UX gaps only → Sprint 04
- Testing procedures → Sprint 05

---

## Topic Cross-Reference

### Security / GDPR Compliance
- Sprint 02: VUL-001 to VUL-007 vulnerability fixes
- Sprint 02: Audit logging for admin actions
- Sprint 02: Input validation patterns

### Appointment Types Feature
- Sprint 01: Architecture diagram
- Sprint 03: Schema migration (deletedAt, indexes)
- Sprint 03: Backend remove mutation
- Sprint 03: Frontend edit/delete UI
- Sprint 05: TEST-APPT-10, TEST-APPT-11, TEST-APPT-12

### Employer Verification Feature
- Sprint 03: Custom rejection reason implementation
- Sprint 05: TEST-EMP-06, TEST-EMP-07

### Audit Logs Feature
- Sprint 03: Backend filter params
- Sprint 04: Frontend filter UI
- Sprint 05: TEST-AUD-05, TEST-AUD-06, TEST-AUD-07

### Dark Mode
- Sprint 04: useTheme hook
- Sprint 04: ThemeToggle component
- Sprint 05: TEST-UX-10

### Mobile Navigation
- Sprint 04: Sheet-based hamburger menu
- Sprint 04: Touch target improvements
- Sprint 05: TEST-UX-11

### Browser-CLI Testing
- Sprint 05: Complete manual test procedures
- Sprint 05: Test execution sequence
- Sprint 05: Evidence collection

### Unit Testing
- Sprint 06: Test file structure
- Sprint 06: Test patterns by component

### Documentation
- Sprint 06: NAV-MAP.md updates
- Sprint 06: Memory file updates
- Sprint 06: Audit report updates

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Architecture Score | 7.5/10 |
| Security Vulnerabilities | 7 (3 HIGH, 4 MEDIUM) |
| Missing Features | 9 → 0 (after implementation) |
| Documentation Coverage | 68.5% → 95% |
| Test Coverage | E2E only → E2E + Unit |
| Total Effort | ~35.5 hours |

---

## File References

### Backend (convex/)
- `appointmentTypes.ts` - 75 LOC → +30 LOC (remove mutation)
- `employers.ts` - 179 LOC (audit logging to add)
- `gdpr.ts` - 390 LOC (filter params, audit logging)
- `schema.ts` - Lines 106-113 (appointmentTypes), add indexes

### Frontend (src/pages/admin/)
- `AppointmentTypes.tsx` - 189 LOC → +80 LOC (edit/delete UI)
- `EmployerVerification.tsx` - 71 LOC → +60 LOC (rejection dialog)
- `AuditLogs.tsx` - 41 LOC → +100 LOC (filter UI)
- `AdminLayout.tsx` - 150 LOC → +50 LOC (mobile nav)

### New Files
- `src/hooks/useTheme.ts` - ~40 LOC
- `src/components/ThemeToggle.tsx` - ~50 LOC
- `src/pages/admin/__tests__/*.test.tsx` - ~400 LOC total

---

## Dependency Graph

```
Sprint 01 (Foundation)
    │
    ├── Sprint 02 (Security) ───────────────────┐
    │                                           │
    ├── Sprint 03 (CRUD) ──────────┐            │
    │                              │            │
    └── Sprint 04 (UX) ────────────┤            │
                                   │            │
                                   ▼            │
                          Sprint 05 (Testing) ◄─┘
                                   │
                                   ▼
                          Sprint 06 (Docs)
```

---

## Quick Commands

```bash
# Read all sprints
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY")
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_02_SECURITY")
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_03_CRUD_IMPLEMENTATION")
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION")
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_05_MANUAL_TESTING")
mcp__serena__read_memory("ADMIN_GAPS_SPRINT_06_TESTING_DOCS")
```

---

## Related Memories

- `AUDIT_REPORT_ADMIN_PORTAL_2026-01-06` - Original audit report
- `13_BACKEND_DISCOVERY_ADMIN_PORTAL_2026-01-06` - Backend discovery
- `AUDIT_LOGS_FEATURE_DISCOVERY_2026-01-06` - Audit logs deep dive
- `EMPLOYER_VERIFICATION_FEATURE_DISCOVERY_2026-01-06` - Employer feature deep dive
