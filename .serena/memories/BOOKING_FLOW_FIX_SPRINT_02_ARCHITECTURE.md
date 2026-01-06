# Architecture & Data Flow
**Sprint**: 02 of 06
**Index**: BOOKING_FLOW_FIX_INDEX
**Depends On**: BOOKING_FLOW_FIX_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: BOOKING_FLOW_FIX_SPRINT_03_SECURITY

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BOOKING FLOW ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────────┘

EMPLOYER PORTAL                    CONVEX BACKEND                  DATABASE
─────────────────                  ──────────────                  ────────

/employer/bookings                 
      │                            
      ▼                            
┌─────────────────┐                
│ BookingsPage    │──Query────────→ appointments.listByEmployer ──→ appointments
│ (83 lines)      │                                                     table
└────────┬────────┘                
         │ [New Booking]           
         ▼                         
┌─────────────────┐                
│ BookingFlow     │──Query────────→ patients.list ────────────────→ patients
│ (188 lines)     │                                                   table
│                 │                
│ STEP 1:         │──Query────────→ appointmentTypes.listActive ──→ appointmentTypes
│ Employee+Type   │                      │                            table (EMPTY!)
│                 │                      └─ Returns []                   │
│ STEP 2:         │──Query────────→ availableSlots.getAvailable ──→ availableSlots
│ Date+Time       │                                                     table
│                 │                
│ STEP 3:         │──Mutation─────→ appointments.book ────────────→ appointments
│ Confirm         │                      │                            table
└─────────────────┘                      ├─ Creates appointment
                                         ├─ Marks slot as "booked"
                                         └─ Logs audit trail
```

---

## Component Hierarchy

```
src/pages/EmployerLayout.tsx (142 lines)
└─ EmployerContext.Provider { employer, isVerified }
   └─ <Routes>
      └─ /employer/bookings
         └─ BookingsPage (83 lines)
            ├─ useQuery(api.appointments.listByEmployer)
            └─ {showBooking && (
               └─ BookingFlow (188 lines)
                  ├─ STATE:
                  │  ├─ step: 1|2|3
                  │  ├─ selectedPatient: Id<"patients">
                  │  ├─ selectedType: Id<"appointmentTypes">
                  │  ├─ selectedDate: string
                  │  ├─ selectedSlot: Id<"availableSlots">
                  │  └─ reason: string
                  │
                  ├─ QUERIES (Lines 30-33):
                  │  ├─ patientsResult = useQuery(api.patients.list)
                  │  ├─ appointmentTypes = useQuery(api.appointmentTypes.listActive) ← EMPTY
                  │  └─ availableSlots = useQuery(api.availableSlots.getAvailable)
                  │
                  └─ MUTATION (Line 34):
                     └─ bookAppointment = useMutation(api.appointments.book)
```

---

## Query Dependency Map

```
┌────────────────────────────────────────────────────────────────┐
│              BOOKING FLOW QUERY DEPENDENCIES                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ON COMPONENT MOUNT (Parallel, Independent):                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ patients.list        → Employee dropdown (Step 1)        │   │
│  │ appointmentTypes     → Type dropdown (Step 1) ← EMPTY    │   │
│  │   .listActive                                            │   │
│  │ availableSlots       → Time grid (Step 2)                │   │
│  │   .getAvailable                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ON DATE CHANGE (Reactive):                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ availableSlots.getAvailable({ date: newDate })           │   │
│  │   → Auto re-fetches with new date parameter              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ON SUBMIT (Step 3):                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ appointments.book({                                      │   │
│  │   patientId, employerId, appointmentTypeId,              │   │
│  │   slotId, reasonForAppointment                           │   │
│  │ })                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema: appointmentTypes

```typescript
// convex/schema.ts (Lines 106-113)
appointmentTypes: defineTable({
  name: v.string(),              // "Initial Assessment"
  description: v.string(),       // "Comprehensive health..."
  durationMinutes: v.number(),   // 60
  price: v.number(),             // 0 (or cost in pence)
  isActive: v.boolean(),         // true = visible to employers
})
  .index("by_active", ["isActive"]),  // For listActive query
```

**Current State**: 0 documents (EMPTY)

---

## Backend Module Analysis

### appointmentTypes.ts (70 lines)

| Function | Type | Lines | Auth | Status |
|----------|------|-------|------|--------|
| `listActive()` | Query | 12-20 | Public | ✅ Works (returns []) |
| `listAll()` | Query | 23-28 | **NONE** | ⚠️ Should be admin-only |
| `getById()` | Query | 31-36 | Public | ✅ Works |
| `create()` | Mutation | 39-52 | **NONE** | ❌ Missing auth |
| `update()` | Mutation | 55-70 | **NONE** | ❌ Missing auth |

### appointments.ts (317 lines)

| Function | Type | Lines | Auth | Status |
|----------|------|-------|------|--------|
| `book()` | Mutation | 159-220 | requireEmployerOwnership | ✅ Secure |
| `listByEmployer()` | Query | 48-82 | requireEmployerOwnership | ✅ Secure |
| `cancel()` | Mutation | 263-288 | requireEmployerOwnership | ✅ Secure |
| `markCompleted()` | Mutation | 235-259 | requireDoctorAccess | ✅ Secure |

---

## Source Tree with File Sizes

```
booking-flow/
├── FRONTEND
│   ├── src/components/employer/
│   │   ├── BookingFlow.tsx         188 lines  ⭐ CORE
│   │   ├── EmployeeForm.tsx        143 lines
│   │   └── EmployeeList.tsx         56 lines
│   │
│   └── src/pages/employer/
│       ├── Bookings.tsx             83 lines  ⭐ CORE
│       ├── Dashboard.tsx           120 lines
│       └── Settings.tsx             49 lines
│
└── BACKEND
    ├── convex/
    │   ├── appointmentTypes.ts      70 lines  ❌ CRITICAL
    │   ├── appointments.ts         317 lines  ✅ SECURE
    │   ├── availableSlots.ts       187 lines  ✅ SECURE
    │   ├── patients.ts             181 lines  ✅ SECURE
    │   └── schema.ts               268 lines
    │
    └── convex/helpers/
        ├── authorization.ts        208 lines
        ├── pagination.ts            35 lines
        └── batchFetch.ts            45 lines

TOTAL: ~2,100 lines across 32+ files
```

---

## Performance Analysis

| Query | Index Used | Performance | Optimization |
|-------|------------|-------------|--------------|
| `patients.list` | by_employer | O(n) employer patients | ✅ Optimal |
| `appointmentTypes.listActive` | by_active | O(n) active types | ✅ Optimal |
| `availableSlots.getAvailable` | by_date_status | O(n) day slots | ⚠️ Could defer until Step 2 |

**Recommendation**: Use Convex `"skip"` parameter to defer slot query until Step 2.

---

→ Next: BOOKING_FLOW_FIX_SPRINT_03_SECURITY
