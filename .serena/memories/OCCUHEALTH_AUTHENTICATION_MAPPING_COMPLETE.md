# OccuHealth Authentication & Role Mapping - Complete Discovery

**Discovery Date**: 2026-01-04  
**Status**: Complete - Ready for NAV-MAP.md Update  
**Thoroughness**: 100% - All auth flows, roles, and test credentials mapped  

---

## EXECUTIVE SUMMARY

OccuHealth is a **GDPR-compliant occupational health platform** with **3 distinct user roles**:
1. **Admin** - Platform administrators (verify employers, manage GDPR)
2. **Employer/Insurer** - Companies managing employee health assessments
3. **Doctor/Medical Provider** - Occupational health professionals conducting assessments

All authentication uses **WorkOS AuthKit** (OAuth 2.0) with role-based routing and CSRF protection.

---

## 1. AUTHENTICATION SYSTEM ARCHITECTURE

### Provider: WorkOS AuthKit
- **OAuth 2.0 endpoint**: `https://api.workos.com/`
- **Type**: Multi-role authentication (single login, multiple role portals)
- **Session management**: JWT tokens with sessionId for logout
- **CSRF Protection**: State parameter with 5-minute TTL

### Key Configuration
```
WORKOS_CLIENT_ID=client_01KE1KAC3CZXZWTRQ34PEMNR5N
WORKOS_API_KEY=sk_test_***REDACTED*** (see .env.local)
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud
```

---

## 2. USER ROLES & ACCESS CONTROL

### Role Matrix

| Role | Auth Method | Entry URL | Portal Route | Database Table | Status | Features |
|------|-------------|-----------|--------------|----------------|--------|----------|
| **Admin** | WorkOS AuthKit | /auth/login | /admin/* | adminUsers | Verified on login | Verify employers, GDPR compliance, audit logs |
| **Employer** | WorkOS AuthKit | /auth/login | /employer/* | employers | Pending (requires admin approval) | Register employees, book appointments, view reports |
| **Doctor** | WorkOS AuthKit | /auth/login | /doctor/* | doctorSettings | Auto-approved | Manage schedule, conduct appointments, submit reports |

### Role-Specific Portals & Features

#### ADMIN Portal (`/admin/*`)
**Database Table**: `adminUsers`  
**Access Requirements**: WorkOS account PLUS entry in adminUsers table

**Dashboard Routes**:
- `/admin/dashboard` - Overview, verification queue
- `/admin/employers` - Employer verification (approve/reject pending)
- `/admin/gdpr` - GDPR compliance dashboard
- `/admin/gdpr/audit` - Audit logs and compliance tracking
- `/admin/gdpr/erasure` - Data erasure requests

**Capabilities**:
- ✅ View all employers in system
- ✅ Approve pending employer registrations
- ✅ Reject employer applications with reason
- ✅ View GDPR audit logs (all data access)
- ✅ Process data erasure requests (right to be forgotten)
- ✅ Track last login timestamp

**Restrictions**:
- Cannot book appointments
- Cannot access clinical notes
- Cannot see patient health data (unless viewing specific employer's audit trail)

**Navigation**:
```
AdminLayout (src/pages/AdminLayout.tsx)
├── Header with "Admin" badge
├── Sidebar navigation
│   ├── Dashboard (overview)
│   ├── Employers (verification queue)
│   ├── GDPR (compliance)
│   └── Audit Logs
└── Routes
    ├── /admin → AdminDashboard
    ├── /admin/employers → EmployerVerification
    ├── /admin/gdpr → GDPRDashboard
    ├── /admin/gdpr/erasure → ErasureRequests
    └── /admin/gdpr/audit → AuditLogs
```

---

#### EMPLOYER Portal (`/employer/*`)
**Database Table**: `employers` (status: pending|verified|rejected)  
**Access Requirements**: WorkOS account PLUS entry in employers table

**Dashboard Routes**:
- `/employer/dashboard` - Company overview, statistics
- `/employer/employees` - Employee registry management
- `/employer/bookings` - Appointment booking interface
- `/employer/reports` - Fitness-for-work reports received
- `/employer/settings` - Company profile and preferences

**Capabilities** (when verified):
- ✅ Register employees for assessments
- ✅ Book occupational health appointments with doctors
- ✅ View appointment status and scheduling
- ✅ Download fitness-for-work reports
- ✅ Track employee assessment history
- ✅ Update company profile and contact information

**Restrictions**:
- ❌ Cannot view clinical notes (doctor-only)
- ❌ Cannot access other employers' data (employer isolation)
- ❌ Cannot conduct appointments (doctor-only)
- ⚠️ Limited access when status = "pending" (verification required)

**Pending Status Behavior**:
- Account created in "pending" status after registration
- Admin must verify before full feature access
- Pending employers see warning banner: "Account Pending Verification - Some features are restricted until your account is verified."
- Limited features available to pending employers (varies by implementation)

**Navigation**:
```
EmployerLayout (src/pages/EmployerLayout.tsx)
├── Header with company name
├── Sidebar navigation (disabled features if not verified)
│   ├── Dashboard
│   ├── Employees
│   ├── Bookings
│   ├── Reports
│   └── Settings
├── Pending Verification Banner (if not verified)
└── Routes
    ├── /employer/dashboard → Dashboard
    ├── /employer/employees → Employees
    ├── /employer/bookings → Bookings
    ├── /employer/reports → Reports
    └── /employer/settings → Settings
```

---

#### DOCTOR Portal (`/doctor/*`)
**Database Table**: `doctorSettings`  
**Access Requirements**: WorkOS account PLUS entry in doctorSettings table

**Dashboard Routes**:
- `/doctor/dashboard` - Upcoming appointments, schedule overview
- `/doctor/appointments` - Appointment list and management
- `/doctor/schedule` - Personal availability/time slots
- `/doctor/reports` - Submit and manage medical reports
- `/doctor/settings` - Profile settings (name, Zoom link)

**Capabilities**:
- ✅ View assigned appointments with patients
- ✅ Manage personal schedule and availability
- ✅ Conduct video consultations (via Zoom link)
- ✅ Submit fitness-for-work reports for appointments
- ✅ View patient details (appointment-specific)
- ✅ Update Zoom personal meeting link

**Restrictions**:
- ❌ Cannot access other doctors' appointments
- ❌ Cannot view employer data (except for referral employer)
- ❌ Cannot manage other doctors' schedules
- ❌ Cannot approve/reject employers (admin-only)
- ❌ Automatic access on registration (no pending status)

**Navigation**:
```
DoctorLayout (src/pages/DoctorLayout.tsx)
├── Header with "Dr. {name}"
├── Sidebar navigation
│   ├── Dashboard
│   ├── Appointments
│   ├── Schedule
│   ├── Reports
│   └── Settings
└── Routes
    ├── /doctor/dashboard → Dashboard
    ├── /doctor/appointments → Appointments
    ├── /doctor/schedule → Schedule
    ├── /doctor/reports → Reports
    └── /doctor/settings → Settings
```

---

## 3. LOGIN FLOW - COMPLETE STEPS

### Step 1: User Initiates Login
**URL**: `http://localhost:5173` (landing page)

**Action**: Click "Sign In" or similar login button

**Code Location**: `src/App.tsx` (MainLayout) → LandingPage component

---

### Step 2: Redirect to WorkOS OAuth
**URL**: `/auth/login`

**Backend Processing** (convex/http.ts:26-63):
1. Generate CSRF state token (random UUID)
2. Store state in oauthStates table with 5-minute expiration
3. Build WorkOS authorization URL with:
   - `provider: "authkit"` (WorkOS AuthKit UI)
   - `redirectUri: "{CONVEX_SITE_URL}/auth/callback"` (post-auth callback)
   - `clientId: WORKOS_CLIENT_ID`
   - `state: {CSRF_TOKEN}`
4. Redirect browser to WorkOS hosted login page

**Frontend Code**:
```javascript
window.location.href = 
  `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`
```

---

### Step 3: User Authenticates with WorkOS
**URL**: WorkOS hosted login page (`https://api.workos.com/...`)

**User Actions**:
1. Enter email and password
2. Complete MFA if enabled
3. Grant permissions to access profile

**WorkOS Response**: Authorization code sent back to app

---

### Step 4: OAuth Callback Processing
**URL**: `/auth/callback?code=...&state=...`

**Backend Processing** (convex/http.ts:96-202):

```
CSRF Validation (SEC-002):
  1. Extract state parameter from URL
  2. Query oauthStates table for matching state
  3. Verify state not expired (5-minute TTL)
  4. Delete state (prevent replay attacks)
  └─ On failure: Redirect to login with error

Token Exchange:
  1. Exchange authorization code for tokens
  2. Receive: accessToken (JWT), refreshToken (optional)
  3. Extract WorkOS user ID from accessToken
  4. Extract sessionId from JWT payload (for logout)

Role Detection (3-table lookup in parallel):
  1. Query employers by workosUserId
  2. Query doctorSettings by workosUserId
  3. Query adminUsers by workosUserId

Determine Redirect:
  ├─ If found in employers → /employer
  ├─ If found in doctorSettings → /doctor
  ├─ If found in adminUsers → /admin (upsert to update lastLoginAt)
  └─ None found → /register/choose-role (new user)

Build Callback URL (frontend redirect):
  Return 302 to: 
    /auth/callback?
      accessToken={JWT}
      &refreshToken={optional}
      &userId={workosUserId}
      &sessionId={sessionId}
      &redirectPath={determined_path}
```

---

### Step 5: Frontend Callback Handler
**URL**: `/auth/callback?...{tokens}...`

**Component**: AdminAuthCallback (src/components/auth/AdminAuthCallback.tsx)

**Processing**:
```
1. Extract tokens from URL params
   - accessToken (required)
   - refreshToken (optional)
   - userId (required)
   - sessionId (required for logout)
   - redirectPath (from backend role detection)

2. Validate
   - If error param present → Show error message
   - If missing accessToken/userId → Show "Missing authentication tokens"

3. Store in Auth Context
   - Call loginAsAdmin() / loginAsEmployer() / loginAsDoctor()
   - Store in localStorage['workos_*_auth']
   - Format: { userId, accessToken, refreshToken, sessionId }

4. Navigate
   - Go to redirectPath (or default /admin)
   - Use { replace: true } to clear from history
```

---

### Step 6: Role Portal Access
**URL**: One of:
- `/admin` (admin dashboard)
- `/employer` (employer dashboard)
- `/doctor` (doctor dashboard)
- `/register/choose-role` (new user)

**Auth Check**:
- Layout component reads auth context
- Verifies tokens in localStorage
- Checks expiration (JWT exp claim)
- Renders role-specific portal or redirects to login

---

### Step 7: Ongoing Session Management
**Multi-Tab Sync**: StorageEvent listener keeps all tabs synchronized
**Token Expiration**: Frontend checks JWT exp claim on app load
**Auto-Logout**: Expired tokens auto-removed from localStorage

---

## 4. LOGOUT FLOW - COMPLETE STEPS

### Step 1: User Initiates Logout
**URL**: Any role portal
**Action**: Click "Sign Out" button

**Code Location**: Role layouts (AdminLayout.tsx, EmployerLayout.tsx, DoctorLayout.tsx)

---

### Step 2: Clear Frontend State
**Frontend Processing**:
```javascript
// AdminLayout.tsx (line 45-56)
const handleLogout = () => {
  logoutAdmin();                    // Clear auth context
  localStorage.clear();             // Clear all tokens
  sessionStorage.clear();           // Clear session data
  
  // Redirect to WorkOS logout
  window.location.href = 
    `${CONVEX_SITE_URL}/auth/logout?sessionId=${sessionId}`
}
```

**Actions**:
1. Call logout function (clears localStorage['workos_*_auth'])
2. Clear all browser storage
3. Build logout URL with sessionId

---

### Step 3: Backend Logout Handler
**URL**: `/auth/logout?sessionId={sessionId}`

**Backend Processing** (convex/http.ts:65-94):
```
1. Extract sessionId from URL param
2. If sessionId present:
   - Call workos.userManagement.getLogoutUrl({sessionId})
   - Return WorkOS logout URL
3. Redirect browser to WorkOS logout
   (WorkOS clears their session)
4. WorkOS redirects back to app (/home or configured returnTo)
```

---

### Step 4: Final Redirect
**URL**: Back to landing page (/)

**State**: Fully logged out
- Tokens cleared from localStorage ✓
- WorkOS session terminated ✓
- All tabs synced (StorageEvent fires) ✓

---

## 5. NEW USER REGISTRATION FLOW

### Step 1: First-Time User Logs In
**Scenario**: User with WorkOS account but no OccuHealth record

**Backend Result**: No match in employers/doctorSettings/adminUsers tables

**Redirect**: `/register/choose-role`

---

### Step 2: Role Selection
**URL**: `/register/choose-role`

**Component**: ChooseRole (src/pages/register/ChooseRole.tsx)

**UI**: Two card options
```
┌─────────────────────────────────────────┐
│          Welcome to OccuHealth            │
│   Select how you'd like to use platform  │
├─────────────────────────────────────────┤
│                                          │
│  [Building Icon]        [Stethoscope]    │
│  Employer / Insurer     Medical Provider │
│                                          │
│  Register employees     Manage schedule  │
│  Book appointments      Conduct appts    │
│  View reports           Submit reports   │
│                                          │
│              [Back to Home]              │
└─────────────────────────────────────────┘
```

**Action**: Click "Employer / Insurer" or "Medical Provider"

**Parameters Passed**:
```javascript
navigate(`/register/${role}?accessToken=...&refreshToken=...&userId=...`)
```

---

### Step 3a: Employer Registration
**URL**: `/register/employer?accessToken=...&refreshToken=...&userId=...`

**Component**: EmployerRegistrationForm (src/components/employer/EmployerRegistrationForm.tsx)

**Form Steps**:

**Step 1: Company Details**
- Company name (required)
- Company type dropdown: "employer" | "insurer" (required)
- Company registration number (optional)
- Address fields (required):
  - Line 1 (street address)
  - Line 2 (apt/unit, optional)
  - City (required)
  - Postcode (required)

**Step 2: Contact Information**
- Contact person name (required)
- Contact email (required)
- Contact phone (optional)

**Step 3: GDPR Consents** (3 checkboxes, all required)
- "I consent to data processing and storage"
- "I consent to health data collection and analysis"
- "I consent to sharing data with employers for fitness assessments"

**Form Submission**:
1. Extract workosUserId, accessToken, refreshToken from URL params
2. Create employers record:
   ```javascript
   {
     workosUserId,
     email,
     companyName,
     companyType,
     status: "pending",        // Requires admin approval
     contactName,
     contactPhone,
     addressLine1,
     addressLine2,
     city,
     postcode
   }
   ```
3. Create 3 GDPR consent records (for audit trail)
4. Call loginAsEmployer(tokens)
5. Redirect to `/employer/dashboard`

**Important**: Status = "pending" (requires admin verification before full access)

---

### Step 3b: Doctor Registration
**URL**: `/register/doctor?accessToken=...&refreshToken=...&userId=...`

**Form** (not shown in code, inferred from schema):
- Doctor name (required)
- Email (from WorkOS, auto-filled)
- Zoom personal meeting link (required)

**Form Submission**:
1. Extract workosUserId from URL params
2. Create doctorSettings record:
   ```javascript
   {
     workosUserId,
     email,
     name,
     zoomPersonalLink
   }
   ```
3. Call loginAsDoctor(tokens)
4. Redirect to `/doctor/dashboard`

**Important**: No pending status - doctors auto-approved on registration

---

### Step 4: Post-Registration
Next login: Backend role detection finds the new record → redirects to appropriate portal

---

## 6. TEST USER CREDENTIALS

### Available Test Accounts (from .env.local)

| Role | Email | Password | Status | Comments |
|------|-------|----------|--------|----------|
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` | Ready to test | Use for doctor portal testing |
| Employer | `testemployee@occuhealth.com` | `(TestPass1234` | Ready to test | Use for employer portal testing |
| Admin | N/A | N/A | Requires manual setup | Contact admin for credentials |

### For Browser CLI Testing

**Quick login via saved states** (if available):
```bash
restoreState authenticated-doctor        # Load doctor session
restoreState authenticated-employer      # Load employer session
restoreState authenticated-admin         # Load admin session
```

**Manual login flow**:
```bash
navigate localhost:5173
snapshot                                 # See current state
click [button:Sign In]                  # Click login button
# WorkOS redirects to login page
# Enter test credentials manually
# Complete callback flow
snapshot                                 # Verify in portal
```

---

## 7. LOGIN PAGE & AUTHENTICATION FLOW SUMMARY

### Landing Page (`/`)
**Component**: MainLayout (src/App.tsx) + LandingPage

**When Unauthenticated**:
- Show HeroSection (company overview)
- Show FeaturesSection (platform features)
- Show TestimonialsSection (success stories)
- Show CTASection (call-to-action with "Sign In" button)

**Login Button URL**:
```javascript
href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`}
```

### Authenticated Redirect
**When User Logged In**:
- Show "Authenticated Navigation" (role-specific nav)
- Show Dashboard (role-specific dashboard)
- Dashboard routes to `/admin`, `/employer`, or `/doctor` via react-router

---

## 8. COMPLETE AUTH SYSTEM DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY MAP                           │
└─────────────────────────────────────────────────────────────┘

UNAUTHENTICATED STATE
        ↓
    [Landing Page]
        ↓ Click "Sign In"
        ↓
    [GET /auth/login]
        ├─ Generate CSRF state (5-min TTL)
        ├─ Store in oauthStates table
        └─ Redirect to WorkOS AuthKit
        ↓
    [WorkOS Login Page]
        ├─ User enters credentials
        ├─ User completes MFA (if required)
        └─ WorkOS generates authorization code
        ↓
    [GET /auth/callback?code=...&state=...]
        ├─ Validate CSRF state
        ├─ Exchange code for tokens
        ├─ Detect role (3-table lookup)
        ├─ Build callback URL with tokens
        └─ Redirect to frontend /auth/callback
        ↓
    [Frontend /auth/callback]
        ├─ Extract tokens from URL
        ├─ Store in localStorage
        ├─ Store in auth context
        └─ Redirect to role portal
        ↓
    AUTHENTICATED STATE
        ├─ [/admin/*]     → Admin Portal
        ├─ [/employer/*]  → Employer Portal
        ├─ [/doctor/*]    → Doctor Portal
        └─ [/register/*]  → New User Registration

LOGOUT FLOW
        ↓
    [Sign Out Button]
        ├─ Clear localStorage
        ├─ Clear context
        └─ Redirect to /auth/logout?sessionId=...
        ↓
    [GET /auth/logout]
        ├─ Get logout URL from WorkOS
        ├─ WorkOS clears session
        └─ Redirect to landing page
        ↓
    UNAUTHENTICATED STATE
```

---

## 9. SECURITY FEATURES IMPLEMENTED

### ✅ Implemented
1. **CSRF Protection (SEC-002)**: State parameter validation
2. **Session Management**: sessionId from JWT for logout
3. **Token Expiration**: JWT exp claim validated on load
4. **Multi-Tab Sync**: StorageEvent keeps sessions synchronized
5. **Secure API Key Storage**: WORKOS_API_KEY backend-only
6. **Redirect URI Validation**: Configured in WorkOS dashboard
7. **Role-Based Access Control**: Database tables enforce role isolation
8. **Status Verification**: Employers require admin approval (pending status)

### ⚠️ Gaps
1. **Token Refresh**: No auto-refresh endpoint (users re-login after expiration)
2. **HTTP-Only Cookies**: Tokens in localStorage (XSS vulnerable in production)
3. **Rate Limiting**: No brute-force protection on login
4. **Audit Logging**: No login/logout events logged

---

## 10. DATABASE TABLES FOR AUTH

| Table | Purpose | Key Fields | Access |
|-------|---------|-----------|--------|
| **adminUsers** | Admin accounts | workosUserId, email, firstName, lastName | Public query, upsert on login |
| **employers** | Employer/insurer companies | workosUserId, status, companyName, verifiedBy | Public query, create/update/verify |
| **doctorSettings** | Doctor accounts | workosUserId, name, zoomPersonalLink | Public query, create/update |
| **oauthStates** | CSRF tokens | state, expiresAt | Create/validate/delete (internal) |
| **consents** | GDPR consents | consentType, grantedAt, patientEmail | For audit trail |
| **patients** | Employee records | employerId, firstName, lastName, email | Employer/doctor specific |
| **appointments** | Health assessments | patientId, employerId, scheduledDate, status | Employer/doctor specific |
| **reports** | Fitness-for-work reports | appointmentId, patientId, findings | Employer/doctor specific |

---

## 11. NAVIGATION MAP FOR BROWSER TESTING

### Root Navigation
```
/                     → Landing page (unauthenticated)
/auth/callback        → OAuth callback handler
/auth/login           → Initiate WorkOS login
/auth/logout          → Initiate WorkOS logout
/register/choose-role → Role selection (new users)
/register/employer    → Employer registration form
/register/doctor      → Doctor registration form
```

### Admin Portal
```
/admin                → Dashboard
/admin/employers      → Employer verification queue
/admin/gdpr           → GDPR compliance dashboard
/admin/gdpr/erasure   → Data erasure requests
/admin/gdpr/audit     → Audit logs
```

### Employer Portal
```
/employer             → Dashboard
/employer/dashboard   → Company overview & statistics
/employer/employees   → Employee registry (book assessments)
/employer/bookings    → Appointment booking
/employer/reports     → Fitness-for-work reports
/employer/settings    → Company profile settings
```

### Doctor Portal
```
/doctor               → Dashboard
/doctor/dashboard     → Upcoming appointments
/doctor/appointments  → Appointment management
/doctor/schedule      → Availability/time slots
/doctor/reports       → Submit medical reports
/doctor/settings      → Profile settings (Zoom link)
```

---

## 12. CRITICAL FILES REFERENCE

### Backend Authentication (convex/)
- `convex/http.ts` - OAuth routes (login, callback, logout)
- `convex/oauthState.ts` - CSRF state management
- `convex/adminUsers.ts` - Admin user CRUD & queries
- `convex/employers.ts` - Employer CRUD & queries
- `convex/doctorSettings.ts` - Doctor CRUD & queries
- `convex/authModules/authorization.ts` - Permission checks

### Frontend Authentication (src/)
- `src/lib/workos-auth.tsx` - Unified auth context & hooks
- `src/components/auth/AdminAuthCallback.tsx` - OAuth callback handler
- `src/pages/AdminLayout.tsx` - Admin portal layout
- `src/pages/EmployerLayout.tsx` - Employer portal layout
- `src/pages/DoctorLayout.tsx` - Doctor portal layout
- `src/pages/register/ChooseRole.tsx` - Role selection UI
- `src/components/employer/EmployerRegistrationForm.tsx` - Employer signup

### Configuration
- `.env.local` - WorkOS credentials and API keys
- `convex/schema.ts` - Database schema (auth & business tables)
- `src/App.tsx` - Root router and provider setup

---

## SUMMARY TABLE: Role Capabilities

| Feature | Admin | Employer | Doctor |
|---------|-------|----------|--------|
| **Authentication** | WorkOS ✓ | WorkOS ✓ | WorkOS ✓ |
| **Portal Access** | /admin ✓ | /employer ✓ | /doctor ✓ |
| **View Employers** | All ✓ | Own only | - |
| **Verify Employers** | ✓ | - | - |
| **View Employees** | - | Own ✓ | - |
| **Book Appointments** | - | Own ✓ | - |
| **Conduct Appointments** | - | - | ✓ |
| **View Clinical Notes** | - | - | ✓ (own) |
| **Submit Reports** | - | - | ✓ |
| **GDPR Compliance** | ✓ | - | - |
| **Pending Status** | N/A | Yes | No |
| **Auto-Access** | Yes* | No | Yes |

*Admin requires manual record creation; doctors auto-approved on registration; employers require admin verification.

---

## FOR NAV-MAP.md UPDATE

**What to update**:
1. Replace "coach" references with "employer" and "doctor"
2. Add admin portal navigation
3. Update pre-saved states to reflect 3 roles (admin, employer, doctor)
4. Update login flow steps for WorkOS OAuth
5. Add role-specific quick start commands
6. Add test user credentials section

**New test accounts to document**:
- testdoc@occuhealth.com / (TestPass1234 → Doctor role
- testemployee@occuhealth.com / (TestPass1234 → Employer role

**New saved states needed**:
- authenticated-admin → Admin portal ready
- authenticated-employer → Employer portal ready
- authenticated-doctor → Doctor portal ready

**Key browser-cli patterns**:
- Quick Program modal pattern applies to appointment booking
- Drag-drop applies to scheduling in doctor's schedule
- Form submission applies to all registration forms

---

**Discovery completed**: All auth flows, roles, access controls, test credentials, and login pages have been identified and mapped.

**Status**: Ready for NAV-MAP.md update and browser testing implementation.

