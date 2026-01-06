# Seed Data & Appointment Types Discovery (2026-01-05)

## INVESTIGATION CONTEXT
**Issue**: Appointment Type dropdown has NO OPTIONS in employer portal booking flow (Book Appointment - Step 1 of 3)
**Root Cause**: `appointmentTypes` table is empty in Convex database - no seed data exists

## KEY FINDINGS

### 1. APPOINTMENTTYPES TABLE STRUCTURE ✅
**Location**: `convex/schema.ts` (lines 103-113)
- Table: `appointmentTypes`
- Fields:
  - `name` (string, required)
  - `description` (string, required)
  - `durationMinutes` (number, required)
  - `price` (number, required)
  - `isActive` (boolean, required)
- Index: `by_active` on `isActive` field

### 2. APPOINTMENTTYPES MUTATIONS & QUERIES ✅
**Location**: `convex/appointmentTypes.ts` (71 lines)

**Queries**:
- `listActive()` - Returns only active appointment types (used by BookingFlow)
- `listAll()` - Returns all types, admin-only
- `getById(typeId)` - Get single type by ID

**Mutations**:
- `create(name, description, durationMinutes, price)` - Creates new type with `isActive: true`
- `update(typeId, ...)` - Updates fields, optional isActive flag

### 3. USAGE IN BOOKING FLOW ✅
**Location**: `src/components/employer/BookingFlow.tsx` (lines 1-188)
- Line 32: `const appointmentTypes = useQuery(api.appointmentTypes.listActive);`
- Used to populate dropdown in Step 1 of 3 (lines 80-93)
- Displays format: `{name} ({durationMinutes} min)`

### 4. SEED DATA STATUS ❌
**No seed files found in codebase**:
- `setup.mjs` - Only runs @convex-dev/auth config, NO appointment type seeding
- No dedicated seed/*.ts files
- No appointment type creation in migrations
- No HTTP endpoint for seeding (checked convex/http.ts)
- No test fixtures with appointment types
- Zero hardcoded appointment type data in src/

**Search patterns used**:
- `setup.{mjs,ts,js}` → Only found auth setup
- `**/seed*.ts` → No results
- `**/init*.ts` → No results  
- `**/fixture*.ts` → No results
- `appointmentTypes.create` calls → Zero found

### 5. APPOINTMENT TYPES NOT CREATED ANYWHERE 🚨
Evidence of missing implementation:
- No `api.appointmentTypes.create()` calls in frontend code
- No mutations triggering appointment type creation in backend
- No admin UI for managing appointment types
- BookingFlow expects data but has no way to populate it

## ROOT CAUSE ANALYSIS

The application has:
✅ Database schema defined
✅ Backend queries & mutations implemented  
✅ Frontend component expecting data
❌ **NO mechanism to populate the data**

This is a classic **missing data initialization layer** problem.

## RECOMMENDATIONS

### SHORT TERM (Quick Fix for Testing)
Use Convex CLI to manually create sample appointment types:

```bash
# In terminal:
npx convex run appointmentTypes:create --args '{
  "name": "Initial Assessment",
  "description": "Initial health assessment",
  "durationMinutes": 30,
  "price": 0
}'

npx convex run appointmentTypes:create --args '{
  "name": "Follow-up Appointment", 
  "description": "Follow-up consultation",
  "durationMinutes": 20,
  "price": 0
}'

npx convex run appointmentTypes:create --args '{
  "name": "Health Screening",
  "description": "Occupational health screening",
  "durationMinutes": 45,
  "price": 0
}'
```

### LONG TERM (Production-Ready)
**Option A: Admin UI** (Recommended)
- Create admin page at `/admin/appointment-types`
- Add UI for creating/editing/deactivating types
- Components would use `api.appointmentTypes.create()` and `api.appointmentTypes.update()`

**Option B: Seed Script** (For initial deployment)
- Create `convex/seed/appointmentTypes.ts` with hardcoded types
- Call from `setup.mjs` or deployment pipeline
- Pattern: Check if table empty, insert default types

**Option C: HTTP Endpoint** (For external integration)
- Add POST `/api/admin/appointment-types` to `convex/http.ts`
- Validate admin auth
- Accept JSON payload and create type

## FILES TO MONITOR
- `convex/appointmentTypes.ts` - Backend mutations/queries
- `src/components/employer/BookingFlow.tsx` - Frontend dropdown
- `convex/schema.ts` - Schema definition
- **Missing**: Seed file or admin UI

## BLOCKERS
- **Appointment Type dropdown is empty** because DB is empty
- No way to populate except manual CLI calls or UI creation
- Booking flow will fail if user tries to submit (no types to select)

## NEXT ACTIONS
1. Create appointment types manually using Convex CLI (test/dev)
2. Implement admin UI or seed script for long-term solution
3. Update deployment guide to include appointment type initialization
