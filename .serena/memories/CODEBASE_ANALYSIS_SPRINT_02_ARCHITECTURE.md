# Architecture Deep Dive
**Sprint**: 02 of 06
**Index**: CODEBASE_ANALYSIS_INDEX
**Depends On**: CODEBASE_ANALYSIS_SPRINT_01_EXECUTIVE_OVERVIEW
**Next**: CODEBASE_ANALYSIS_SPRINT_03_SECURITY

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     OCCUHEALTH SYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FRONTEND (React 19 + Vite)                                            │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐     │
│   │   Landing   │  │  Employer   │  │   Doctor    │  │   Admin   │     │
│   │   (Public)  │  │  (5 pages)  │  │  (5 pages)  │  │ (5 pages) │     │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘     │
│          │                │                │                │           │
│          └────────────────┴────────────────┴────────────────┘           │
│                                   │                                      │
│                    ConvexProviderWithAuthKit                            │
│                    (JWT in Authorization header)                        │
│                                   │                                      │
├───────────────────────────────────┼──────────────────────────────────────┤
│                                   │                                      │
│   CONVEX CLOUD (Backend)          ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ HTTP Endpoints: /auth/login, /auth/callback, /auth/refresh      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Domain Modules (9)        │ Infrastructure (6)                   │   │
│   │ patients.ts       181L    │ schema.ts           294L             │   │
│   │ appointments.ts   317L    │ http.ts             286L             │   │
│   │ availableSlots.ts 659L ⚠  │ authModules/        208L             │   │
│   │ reports.ts        239L    │ helpers/ (pagination, batch, audit) │   │
│   │ gdpr.ts           430L    │ lib/dateUtils.ts    207L             │   │
│   │ employers.ts      234L    │                                      │   │
│   │ doctorSettings.ts 144L    │                                      │   │
│   │ adminUsers.ts     118L    │                                      │   │
│   │ appointmentTypes  213L    │                                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Database: 14 tables + 38 indexes                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│   EXTERNAL SERVICES                                                      │
│   ┌──────────────────┐         ┌──────────────────────┐                 │
│   │   WorkOS Cloud   │         │    Convex Cloud      │                 │
│   │ • AuthKit UI     │         │ • Real-time subs     │                 │
│   │ • User Mgmt      │         │ • Serverless funcs   │                 │
│   │ • JWT/JWKS       │         │ • Managed DB         │                 │
│   └──────────────────┘         └──────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
User Click "Login"
       │
       ▼
GET /auth/login (Convex HTTP)
       │
       ├─ Generate CSRF state (crypto.randomUUID)
       ├─ Store in oauthStates table (5-min TTL)
       │
       ▼
Redirect to WorkOS AuthKit
       │
       ▼
User Authenticates (email/password/SSO)
       │
       ▼
GET /auth/callback?code=...&state=...
       │
       ├─ Validate CSRF state
       ├─ Exchange code for tokens (WorkOS SDK)
       ├─ Query role tables (employers, doctors, admins)
       ├─ Determine redirect path
       │
       ▼
Redirect to Frontend /auth/callback
       │
       ├─ Extract tokens from URL
       ├─ Store in localStorage (role-specific key)
       │
       ▼
Navigate to Portal
```

---

## Database Schema (14 Tables)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `adminUsers` | Platform administrators | by_workos_user_id, by_email |
| `employers` | Companies/insurers | by_workos_user, by_status, by_email |
| `doctorSettings` | Doctor profiles | by_workos_user |
| `patients` | Employee records | by_employer, by_email, by_deleted |
| `appointments` | Scheduled visits | by_employer, by_patient, by_date, by_status |
| `availableSlots` | Doctor time slots | by_date, by_status, by_doctor_date, by_template |
| `recurringSlotTemplates` | Slot templates | by_doctor, by_doctor_status |
| `appointmentTypes` | Type catalog | by_active, by_deleted |
| `reports` | Fit-for-work reports | by_employer, by_appointment, by_patient |
| `clinicalNotes` | Doctor notes (protected) | by_appointment, by_patient |
| `consents` | GDPR consent records | by_patient, by_email, by_type |
| `auditLogs` | Activity tracking | by_action, by_timestamp, by_resource |
| `erasureRequests` | GDPR erasure requests | by_status, by_email |
| `oauthStates` | OAuth CSRF tokens | by_state |

**Total Indexes: 38** (verified count, not 22 as initially estimated)

---

## Frontend Component Hierarchy

```
src/
├── App.tsx (267L) ─────────────────── Main router, lazy loading
├── main.tsx ───────────────────────── Entry point, providers
│
├── pages/ (15 pages + 3 layouts)
│   ├── EmployerLayout.tsx (185L) ─── Sidebar nav, auth guard
│   │   └── Dashboard, Employees, Bookings, Reports, Settings
│   ├── DoctorLayout.tsx (160L) ───── Sidebar nav, auth guard
│   │   └── Dashboard, Appointments, Schedule, Reports, Settings
│   ├── AdminLayout.tsx (222L) ────── Top nav, admin verification
│   │   └── Dashboard, Employers, GDPR, AuditLogs, AppointmentTypes
│   └── register/ChooseRole.tsx ───── Role selection
│
├── components/ (41 total)
│   ├── employer/ ─────────────────── BookingFlow, EmployeeForm, etc.
│   ├── doctor/ ───────────────────── WeekCalendarView, recurring/*
│   ├── landing/ ──────────────────── 6 marketing sections
│   ├── auth/ ─────────────────────── AdminAuthCallback, SignOutButton
│   ├── layout/ ───────────────────── NavigationBar, Container, Footer
│   └── ui/ ───────────────────────── 14 shadcn/ui primitives
│
├── lib/
│   └── workos-auth.tsx (477L) ────── Auth context, token refresh
│
└── types/ ────────────────────────── TypeScript definitions
```

---

## Backend Module Structure

```
convex/
├── schema.ts (294L) ──────────────── 14 tables, 38 indexes
├── http.ts (286L) ────────────────── OAuth endpoints
├── auth.config.ts ────────────────── JWT validation (RS256)
│
├── Domain Modules (9):
│   ├── availableSlots.ts (659L) ⚠── Needs modular split
│   ├── gdpr.ts (430L) ────────────── Consent, audit, erasure
│   ├── appointments.ts (317L) ────── Booking workflow
│   ├── reports.ts (239L) ─────────── Fit-for-work reports
│   ├── employers.ts (234L) ───────── Company management
│   ├── appointmentTypes.ts (213L) ── Type catalog
│   ├── patients.ts (181L) ────────── Employee records
│   ├── doctorSettings.ts (144L) ──── Doctor profiles
│   └── adminUsers.ts (118L) ──────── Admin management
│
├── authModules/
│   └── authorization.ts (208L) ───── requireAdmin, requireEmployer, etc.
│
└── helpers/
    ├── pagination.ts ─────────────── Cursor-based pagination
    ├── batchFetch.ts ─────────────── N+1 prevention
    └── auditLogger.ts ────────────── Audit log wrapper
```

---

## Performance Optimizations

### Database
- **38 indexes** for query optimization (compound indexes on availableSlots)
- **Batch fetching** eliminates N+1 queries
- **Cursor pagination** (50 items default)

### Frontend
- **Lazy loading** all portal routes
- **Code splitting** via React.lazy()
- **Memoized auth context**

### Build
- **tsgo** for 10x faster type checking
- **Vite** with Tailwind plugin

---

## Modular Architecture Pattern

**Threshold:** >400 lines = concern, >800 lines = must split

**Pattern:** Facade file (<100 lines) + focused modules

**Example (Reference):**
```
moduleModules/
├── module.ts (facade, re-exports)
├── queries.ts
├── mutations.ts
└── domain.ts
```

**Needs Refactoring:**
- `availableSlots.ts` at 659 lines → split into `availableSlotsModules/`

---

→ Next: CODEBASE_ANALYSIS_SPRINT_03_SECURITY
