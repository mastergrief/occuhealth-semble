# OccuFlow - System Architecture

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

## Authentication Flow (WorkOS AuthKit + JWT)
```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks login → Redirect to WorkOS AuthKit                   │
│ 2. WorkOS authenticates → Callback to /auth/callback                │
│ 3. Convex HTTP handler:                                             │
│    - Exchanges code for access/refresh tokens                       │
│    - Creates/updates user in adminUsers/employers/doctorSettings    │
│    - Returns tokens via URL params to frontend                      │
│ 4. Frontend stores tokens in localStorage                           │
│ 5. ConvexProviderWithAuthKit sends JWT in requests                  │
│ 6. auth.config.ts validates JWT via WorkOS JWKS                     │
│ 7. ctx.auth.getUserIdentity() returns authenticated user            │
└─────────────────────────────────────────────────────────────────────┘

Token Validation (auth.config.ts):
- Two providers required for WorkOS:
  1. SSO: issuer "https://api.workos.com/"
  2. User Management: issuer "https://api.workos.com/user_management/{clientId}"
- Both use same JWKS: https://api.workos.com/sso/jwks/{clientId}
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
| `src/main.tsx` | ConvexProviderWithAuthKit + WorkOS setup |
| `src/App.tsx` | Root routing, lazy loading |
| `src/lib/workos-auth.tsx` | WorkOS auth context and role-specific hooks |
| `convex/auth.config.ts` | **Two-provider JWT config** (SSO + User Management) |
| `convex/http.ts` | Auth HTTP endpoints (/auth/login, /auth/callback) |
| `convex/schema.ts` | Database schema |
