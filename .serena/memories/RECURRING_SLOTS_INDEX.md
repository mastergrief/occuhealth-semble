# Weekly Recurring Slots Feature - Sprint Index

**Created**: 2026-01-06
**Total Sprints**: 6
**Total Words**: ~5,200
**Scope**: Doctor Schedule feature enhancement for 7-day configurable recurring slot creation

## Executive Summary

The Doctor Schedule page currently supports single-slot creation. This feature adds weekly recurring slots with:
- Day-of-week selection (Mon-Sun toggles)
- Time slot templates (reusable across days)
- Multi-week application (apply pattern to N weeks)
- Conflict detection and preview
- Week calendar view enhancement

**Architecture Score**: 8.5/10 (existing feature)
**Estimated Effort**: 12-17 hours (5 implementation phases)

## Sprint Manifest

| # | Name | Words | Status | Dependencies | Priority |
|---|------|-------|--------|--------------|----------|
| 01 | Executive Summary & Architecture | ~800 | Pending | None | P0 |
| 02 | Backend Schema & Mutations | ~1,200 | Pending | 01 | P0 |
| 03 | Frontend Components | ~1,000 | Pending | 02 | P1 |
| 04 | Testing & Quality | ~900 | Pending | 02, 03 | P1 |
| 05 | Security & Pre-Flight Fixes | ~600 | Pending | 01 | P0 |
| 06 | Browser-CLI Manual Testing | ~700 | Pending | All | P1 |

## Reading Order

1. **RECURRING_SLOTS_SPRINT_01_ARCHITECTURE** - Feature overview, current state, proposed architecture
2. **RECURRING_SLOTS_SPRINT_05_SECURITY** - Critical fixes required BEFORE implementation (GDPR, validation)
3. **RECURRING_SLOTS_SPRINT_02_BACKEND** - Schema changes, new mutations, helper functions
4. **RECURRING_SLOTS_SPRINT_03_FRONTEND** - UI components, wireframes, state management
5. **RECURRING_SLOTS_SPRINT_04_TESTING** - Unit tests, integration tests, coverage requirements
6. **RECURRING_SLOTS_SPRINT_06_BROWSER_CLI** - Manual testing checklist with Browser-CLI commands

## Topic Cross-Reference

| Topic | Sprints |
|-------|---------|
| Schema Changes | 02 |
| Authentication/Auth | 02, 05 |
| Convex Mutations | 02 |
| React Components | 03 |
| State Management | 03 |
| Conflict Detection | 02, 03 |
| Unit Testing | 04 |
| E2E Testing | 06 |
| GDPR/Audit Logging | 05 |
| Validation | 02, 05 |
| Browser-CLI | 06 |

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/pages/doctor/Schedule.tsx` | 143 | Main schedule page (modify) |
| `convex/availableSlots.ts` | 187 | Backend API (modify) |
| `convex/schema.ts` | 272 | Database schema (modify) |
| `src/types/doctor.ts` | 158 | Type definitions (modify) |

## Implementation Phases

| Phase | Scope | Effort | Sprint |
|-------|-------|--------|--------|
| Phase 1 | Schema + Backend | 2-3 hours | Sprint 02 |
| Phase 2 | Basic Recurring Form | 3-4 hours | Sprint 03 |
| Phase 3 | Conflict Detection UX | 2-3 hours | Sprint 03 |
| Phase 4 | Week View Enhancement | 3-4 hours | Sprint 03 |
| Phase 5 | Template Management | 2-3 hours | Sprint 03 |

## Critical Pre-Flight (Sprint 05)

**Must complete BEFORE feature implementation:**
1. ❌ Add audit logging to slot mutations (GDPR)
2. ❌ Add backend date/time validation
3. ⚠️ Fix race condition in concurrent bookings
4. ⚠️ Implement unblockSlot UI or remove function

---
**Navigation**: Start with Sprint 01 → Then Sprint 05 (pre-flight) → Then Sprints 02-04 → Finally Sprint 06
