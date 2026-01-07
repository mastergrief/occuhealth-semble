# Patient Appointment Access - Sprint Index

**Created**: 2026-01-07
**Total Sprints**: 4
**Total Words**: ~3,150
**Scope**: Phase 1 - Magic Link + Calendar Integration + Browser-CLI Testing

---

## Executive Summary

Enable employees/patients to access their appointment details without requiring account creation. Phase 1 implements:
- **Magic Link**: Secure tokenized URL (48hr TTL) for appointment viewing
- **Calendar Integration**: ICS file generation for calendar apps
- **Share Workflow**: Employer generates link from Bookings page

---

## Sprint Manifest

| # | Name | Est. Words | Status | Dependencies |
|---|------|-----------|--------|--------------|
| 01 | Overview & Architecture | ~650 | 📋 Ready | None |
| 02 | Backend Implementation | ~850 | 📋 Ready | Sprint 01 |
| 03 | Frontend Implementation | ~750 | 📋 Ready | Sprint 02 |
| 04 | Browser-CLI Testing | ~900 | 📋 Ready | Sprint 03 |

---

## Reading Order

1. **PATIENT_ACCESS_SPRINT_01_OVERVIEW** - Architecture, schema, security model
2. **PATIENT_ACCESS_SPRINT_02_BACKEND** - Convex functions, token management, ICS generation
3. **PATIENT_ACCESS_SPRINT_03_FRONTEND** - React page, employer share button
4. **PATIENT_ACCESS_SPRINT_04_BROWSER_TESTING** - 8 Browser-CLI test cases

---

## Topic Cross-Reference

| Topic | Sprint(s) |
|-------|-----------|
| Architecture/Design | 01 |
| Database Schema | 01, 02 |
| Security (Token hashing, TTL) | 01, 02 |
| Token Generation | 02 |
| Token Validation | 02 |
| ICS Calendar | 02 |
| HTTP Endpoints | 02 |
| Patient View Page | 03 |
| Employer Share Button | 03 |
| Routing (App.tsx) | 03 |
| Browser-CLI Commands | 04 |
| Test Cases | 04 |
| Evidence Collection | 04 |

---

## New Files Created

```
convex/
├── appointmentTokens.ts           [Sprint 02]
├── lib/
│   └── icsGenerator.ts            [Sprint 02]

src/
├── pages/
│   └── patient/
│       └── ViewAppointment.tsx    [Sprint 03]
```

---

## Files Modified

| File | Sprint | Changes |
|------|--------|---------|
| `convex/schema.ts` | 02 | Add `appointmentTokens` table |
| `convex/http.ts` | 02 | Add `/calendar/:token` route |
| `src/App.tsx` | 03 | Add `/view-appointment/:token` route |
| `src/pages/employer/Bookings.tsx` | 03 | Add Share button |

---

## Acceptance Criteria Summary

### Sprint 01
- [x] Architecture documented
- [x] Schema defined
- [x] Security model specified

### Sprint 02
- [ ] Schema migration successful
- [ ] Token generation works
- [ ] Token validation works
- [ ] ICS generation works
- [ ] Audit logging on token creation

### Sprint 03
- [ ] Route exists and loads
- [ ] Valid token shows details
- [ ] Invalid/expired shows error
- [ ] Calendar download works
- [ ] Share button in employer portal

### Sprint 04
- [ ] PT-01: Generate link passes
- [ ] PT-02: View appointment passes
- [ ] PT-03: Invalid token passes
- [ ] PT-04: Expired token passes
- [ ] PT-05: Calendar download passes
- [ ] PT-06: Mobile responsive passes
- [ ] PT-07: Zoom link passes
- [ ] PT-08: Copy feedback passes

---

## Implementation Estimate

| Sprint | Estimated Time |
|--------|----------------|
| 01 | 30 min (planning) |
| 02 | 2-3 hours (backend) |
| 03 | 2-3 hours (frontend) |
| 04 | 1-2 hours (testing) |
| **Total** | **5-8 hours** |

---

## Quick Commands Reference

```bash
# Backend development
npm run typecheck
npm run convex:dev

# Frontend development
npm run dev

# Generate token (Convex CLI)
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:generate '{"appointmentId":"..."}' --json

# Browser-CLI testing
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts <command>

# Common test commands
restoreState authenticated-employer
navigate http://localhost:5175/employer/bookings
snapshot
click "text:Share"
screenshot evidence.png
```

---

## Status Legend

- 📋 Ready - Sprint documentation complete
- 🚧 In Progress - Currently implementing
- ✅ Complete - Implementation + tests pass
- ❌ Blocked - Requires resolution

---

## Notes

- Phase 2 (PIN access) and Phase 3 (full portal) documented separately if needed
- Email integration (SendGrid/Resend) deferred to future sprint
- Token cleanup cron job (expired tokens) can be added to `convex/crons.ts`
