# OccuHealth - System Architecture

## High-Level Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 19)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Landing   │  │  Employer   │  │   Doctor    │  │  Admin  │ │
│  │    Page     │  │   Portal    │  │   Portal    │  │ Portal  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│         │               │                │              │        │
│         └───────────────┴────────────────┴──────────────┘        │
│                              │                                   │
│                     ┌────────┴────────┐                          │
│                     │  WorkOS Auth    │                          │
│                     │  (AuthKit SSO)  │                          │
│                     └────────┬────────┘                          │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND (Convex Cloud)                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    HTTP Endpoints                             │ │
│  │  /auth/login → WorkOS redirect                               │ │
│  │  /auth/callback → Token exchange, session create             │ │
│  │  /auth/logout → Session destroy                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Convex Functions                           │ │
│  │  appointments.ts  │ patients.ts     │ reports.ts             │ │
│  │  employers.ts     │ availableSlots.ts│ gdpr.ts               │ │
│  │  doctorSettings.ts│ adminUsers.ts   │ appointmentTypes.ts    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Database (Schema)                          │ │
│  │  adminUsers │ employers │ patients │ appointments            │ │
│  │  reports    │ consents  │ auditLogs│ erasureRequests         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Authentication Flow (WorkOS AuthKit)
```
1. User clicks login → Redirect to WorkOS
2. WorkOS authenticates → Callback to /auth/callback
3. Convex HTTP handler:
   - Exchanges code for tokens
   - Creates/updates user in adminUsers/employers/doctorSettings
   - Sets session cookie
4. Frontend reads session → Shows authenticated UI
```

## Database Schema (Key Tables)
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `adminUsers` | Platform admins | workosUserId, email |
| `employers` | Companies/insurers | companyName, status (pending/verified/rejected) |
| `doctorSettings` | Doctor profiles | zoomPersonalLink |
| `patients` | Employee records | employerId, consentId |
| `appointments` | Scheduled visits | patientId, status, slotId |
| `reports` | Fit-for-work reports | fitForWork, restrictions |
| `consents` | GDPR consent records | consentType, granted |
| `auditLogs` | Activity tracking | action, actorType, resourceType |

## Frontend Route Structure
```
/                     → Landing page
/auth/callback        → WorkOS callback handler
/register/choose-role → Role selection
/register/employer    → Employer registration form
/employer/*           → Employer portal (EmployerAuthProvider)
/doctor/*             → Doctor portal (DoctorAuthProvider)
/admin/*              → Admin portal
```

## Key Files
| File | Purpose |
|------|---------|
| `src/App.tsx` | Root routing, lazy loading |
| `src/lib/workos-auth.tsx` | WorkOS auth providers |
| `convex/http.ts` | Auth HTTP endpoints |
| `convex/schema.ts` | Database schema |
