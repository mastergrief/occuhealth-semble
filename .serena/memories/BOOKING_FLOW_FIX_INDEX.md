# BOOKING_FLOW_FIX - Sprint Index

**Created**: 2026-01-05
**Total Sprints**: 6
**Total Words**: ~3,700
**Scope**: Fix empty Appointment Type dropdown in employer booking flow + browser testing

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | Executive Summary & Root Cause | ~500 | Pending | None |
| 02 | Architecture & Data Flow | ~700 | Pending | 01 |
| 03 | Security Vulnerabilities | ~600 | Pending | 01 |
| 04 | Implementation Fixes | ~600 | Pending | 02, 03 |
| 05 | Error Handling & UX | ~500 | Pending | 04 |
| 06 | Browser-CLI Manual Testing | ~800 | Pending | 04 |

---

## Reading Order

1. **BOOKING_FLOW_FIX_SPRINT_01_EXECUTIVE_SUMMARY** - Root cause analysis, impact assessment
2. **BOOKING_FLOW_FIX_SPRINT_02_ARCHITECTURE** - System diagrams, data flow, source tree
3. **BOOKING_FLOW_FIX_SPRINT_03_SECURITY** - Critical vulnerabilities, auth gaps
4. **BOOKING_FLOW_FIX_SPRINT_04_IMPLEMENTATION** - Fix procedures, code changes
5. **BOOKING_FLOW_FIX_SPRINT_05_ERROR_HANDLING** - UX improvements, toast notifications
6. **BOOKING_FLOW_FIX_SPRINT_06_BROWSER_TESTING** - Manual test scripts, verification

---

## Topic Cross-Reference

| Topic | Sprints |
|-------|---------|
| Root Cause (Empty Table) | 01, 04 |
| Database Schema | 02 |
| Security Vulnerabilities | 03, 04 |
| Frontend Components | 02, 05 |
| Backend Mutations | 03, 04 |
| Admin UI | 04 |
| Seed Data | 01, 04 |
| Loading States | 05 |
| Error Handling | 05 |
| Browser Testing | 06 |
| Convex CLI Commands | 04, 06 |

---

## Quick Reference

### Critical Issue
**Problem**: `appointmentTypes` table is EMPTY → Booking flow blocked

### Immediate Fix (5 min)
```bash
npx convex run appointmentTypes:create '{"name":"Initial Assessment","description":"...","durationMinutes":60,"price":0}'
```

### Security Fix (30 min)
Add `await requireAdmin(ctx)` to:
- `appointmentTypes.create()` (line 46)
- `appointmentTypes.update()` (line 64)
- `appointmentTypes.listAll()` (line 25)

### Files Modified
| File | Changes |
|------|---------|
| `convex/appointmentTypes.ts` | Add auth checks |
| `src/components/employer/BookingFlow.tsx` | Loading/empty states |
| `src/pages/admin/AppointmentTypes.tsx` | New file |
| `convex/seed/appointmentTypes.ts` | New file |

---

## Implementation Checklist

- [ ] Seed appointment types via CLI
- [ ] Add requireAdmin to mutations
- [ ] Add loading skeleton to BookingFlow
- [ ] Add empty state message
- [ ] Install sonner for toast notifications
- [ ] Create admin UI for appointment types
- [ ] Create seed script for deployment
- [ ] Run browser-cli manual tests
- [ ] Collect evidence screenshots

---

## Related Memories

| Memory | Relevance |
|--------|-----------|
| `BOOKING_FLOW_COMPLETE_DISCOVERY_2026-01-05` | Discovery agent findings |
| `APPOINTMENT_TYPES_DATA_MODEL_2026-01-05` | Data model analysis |
| `SEED_DATA_DISCOVERY_APPOINTMENTTYPES_2026-01-05` | Seed data analysis |
| `12_EMPLOYER_PORTAL_PAGES_FEATURE_MAP` | Portal page inventory |
| `04_ARCHITECTURE` | System architecture |

---

## Verification Checklist

After implementation:
- [ ] Appointment Type dropdown shows options
- [ ] Booking flow completes successfully
- [ ] Security mutations require admin auth
- [ ] Loading states display during queries
- [ ] Empty state shows helpful message
- [ ] Error toasts display on failures
- [ ] All browser tests pass
