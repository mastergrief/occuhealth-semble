# OccuHealth - Occupational Health Platform

A full-stack GDPR-compliant occupational health platform with **Convex** backend and **WorkOS AuthKit** authentication.

## Features

- **WorkOS AuthKit** - OAuth 2.0 authentication with role-based routing
- **Real-time Data** - Convex reactive queries for instant updates
- **GDPR Compliance** - Audit logging, consent management, data erasure
- **Multi-Portal** - Admin, Employer, and Doctor portals
- **React 19 + Vite** - Modern frontend stack
- **Tailwind CSS v4** - Utility-first styling
- **TypeScript** - Full type safety

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your WorkOS credentials

# Start Convex dev server
npx convex dev

# Start frontend (in another terminal)
npm run dev
```

## Authentication

OccuHealth uses **WorkOS AuthKit** for authentication with three role types:
- **Admin**: Platform administrators (WorkOS User Management)
- **Employer**: Company/insurer accounts
- **Doctor**: Healthcare provider accounts

### Environment Variables

```env
# WorkOS AuthKit
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
VITE_WORKOS_CLIENT_ID=client_...

# Convex (auto-configured)
CONVEX_DEPLOYMENT=dev:your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Site URLs
CONVEX_SITE_URL=https://your-deployment.convex.site
APP_URL=http://localhost:5175
```

### User Roles

| Role | Portal | Features |
|------|--------|----------|
| Admin | `/admin` | Employer verification, GDPR management, audit logs |
| Employer | `/employer` | Employee management, appointment booking, reports |
| Doctor | `/doctor` | Appointments, schedule management, clinical reports |

### Auth Flow

1. User clicks "Login" -> Redirected to WorkOS AuthKit
2. User authenticates with WorkOS
3. WorkOS redirects to `/auth/callback` with tokens
4. Backend detects user role and routes to appropriate portal

For detailed auth architecture, see [DOCUMENTS/AUTH.md](DOCUMENTS/AUTH.md).

## Project Structure

```
convex/
├── http.ts              # HTTP routes (auth callbacks)
├── oauthState.ts        # CSRF state management
├── schema.ts            # Database schema
├── patients.ts          # Patient/employee management
├── appointments.ts      # Appointment scheduling
├── employers.ts         # Employer verification
├── doctors.ts           # Doctor settings
├── gdpr.ts              # GDPR compliance (audit, consent, erasure)
├── reports.ts           # Clinical reports
└── availableSlots.ts    # Doctor availability

src/
├── pages/
│   ├── admin/           # Admin portal pages
│   ├── employer/        # Employer portal pages
│   └── doctor/          # Doctor portal pages
├── components/          # Shared UI components
├── contexts/            # Auth contexts
└── lib/                 # Utilities
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `patients` | Employee/patient records |
| `appointments` | Scheduled appointments |
| `employers` | Employer accounts with verification status |
| `doctors` | Doctor profiles and settings |
| `availableSlots` | Doctor availability slots |
| `reports` | Clinical fitness reports |
| `gdprConsent` | Patient consent records |
| `gdprErasureRequests` | Data erasure requests |
| `auditLogs` | GDPR audit trail |

## API Reference

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | GET | Initiate OAuth flow with WorkOS |
| `/auth/callback` | GET | OAuth callback handler |
| `/health` | GET | Health check |

### Core Mutations

| Function | Description |
|----------|-------------|
| `patients:create` | Create employee with GDPR consent |
| `appointments:book` | Book appointment |
| `employers:verify` | Admin verifies employer |
| `gdpr:processErasure` | Process data erasure request |
| `reports:create` | Create fitness report |

### Core Queries

| Function | Description |
|----------|-------------|
| `patients:list` | List employees by employer |
| `appointments:listByEmployer` | List employer appointments |
| `gdpr:getAuditLogs` | Get GDPR audit trail |
| `availableSlots:getByDateRange` | Get doctor availability |

## Documentation

- [Auth Architecture](./DOCUMENTS/AUTH.md) - Detailed authentication flow

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [WorkOS AuthKit](https://workos.com/docs/user-management)

## License

MIT
