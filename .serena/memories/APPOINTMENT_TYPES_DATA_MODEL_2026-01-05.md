# Appointment Types Data Model Discovery

**Date**: 2026-01-05  
**Status**: CRITICAL - Empty table, booking flow broken  
**Severity**: High - Employer portal Step 1 cannot proceed

## Root Cause
The `appointmentTypes` table is completely empty (0 documents). Frontend query `api.appointmentTypes.listActive()` returns empty array, causing dropdown to show no options in BookingFlow.tsx Step 1.

## Schema Definition
- **File**: `convex/schema.ts` (lines 103-113)
- **Fields**: name, description, durationMinutes, price, isActive
- **Index**: by_active (filters isActive === true)
- **No soft delete**: Types not GDPR-sensitive

## API Functions
- **Queries**: listActive() [frontend], listAll() [admin], getById()
- **Mutations**: create(name, desc, mins, price), update(...)
- **Auth**: NO AUTH ENFORCED (security gap - anyone can create/update)

## Frontend Usage
- **File**: `src/components/employer/BookingFlow.tsx` (line 32)
- **Query**: `useQuery(api.appointmentTypes.listActive)`
- **Display**: Dropdown in Step 1, maps `t.name` and `t.durationMinutes`
- **Behavior**: Empty array → empty options → "Next" button stays disabled

## Data Persistence
- Stored in Convex cloud database
- Real-time subscriptions on frontend
- No seeding mechanism implemented
- No admin UI to create types

## Critical Gaps
1. **No Seed Data**: Table empty on deployment
2. **No Admin UI**: Cannot create types from UI
3. **No Auth**: create/update mutations unprotected
4. **No Initialization**: No HTTP endpoint or CLI helper

## Fix Required Before Production
1. Populate appointmentTypes table with defaults (Initial Assessment, Follow-up, etc.)
2. Add admin UI to `/admin/appointment-types` or `/admin/settings`
3. Add `requireAdmin()` auth checks to mutations
4. Consider seeding on deployment via migrations

## Business Rules (From NAV-MAP)
- Initial Assessment: 60 min baseline
- Follow-up Consultation: 30 min regular
- Return-to-Work: 45 min post-absence
- Fitness Reassessment: 30 min status review

## Query Status
```
$ npx convex data appointmentTypes --limit=100
→ "There are no documents in this table."
```

## Related Components
- BookingFlow.tsx: Blocked at Step 1
- Appointments.ts: Stores appointmentTypeId, enriches with full doc
- Reports.tsx (doctor): No direct dependency
- Admin Portal: Missing type management UI
