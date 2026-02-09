# Nav-Map for OccuHealth
**GDPR-Compliant Occupational Health Platform**

---

## Test Credentials (Development Only)

| Role | Email | Password | Status |
|------|-------|----------|--------|
| **Doctor** | `testdoc@occuhealth.com` | `(TestPass1234` | Ready |
| **Employer** | `testemployee@occuhealth.com` | `(TestPass1234` | Ready |
| **Admin** | Via WorkOS portal | N/A | Manual setup required |

**Note**: These are development-only credentials. Do NOT use in production.

---

## Deployment URLs

| Environment | URL | Convex Backend |
|-------------|-----|----------------|
| **Production (Vercel)** | `https://convex-medical-starter-phi.vercel.app` | `accurate-warbler-380` (DEV) |
| **Local Development** | `http://localhost:5175` | `accurate-warbler-380` (DEV) |

Both URLs work interchangeably for testing. Auth redirects dynamically return to the originating domain via the `returnTo` parameter.

---

## Quick Reference - Complete Route Table

| Route | Portal | Auth Required | Role | Page Component |
|-------|--------|---------------|------|----------------|
| `/` | Landing | No | - | LandingPage (hero/features/cta) |
| `/auth/callback` | Auth | No | - | AdminAuthCallback |
| `/register/choose-role` | Registration | Partial | - | ChooseRole |
| `/register/employer` | Registration | Partial | - | EmployerRegistrationForm |
| `/employer` | Employer | Yes | employer | Redirects to /employer/dashboard |
| `/employer/dashboard` | Employer | Yes | employer | EmployerDashboard |
| `/employer/employees` | Employer | Yes | employer | Employees |
| `/employer/bookings` | Employer | Yes | employer | Bookings |
| `/employer/reports` | Employer | Yes | employer | Reports |
| `/employer/settings` | Employer | Yes | employer | Settings |
| `/doctor` | Doctor | Yes | doctor | Redirects to /doctor/dashboard |
| `/doctor/dashboard` | Doctor | Yes | doctor | DoctorDashboard |
| `/doctor/appointments` | Doctor | Yes | doctor | Appointments |
| `/doctor/schedule` | Doctor | Yes | doctor | Schedule |
| `/doctor/reports` | Doctor | Yes | doctor | Reports |
| `/doctor/settings` | Doctor | Yes | doctor | Settings |
| `/admin` | Admin | Yes | admin | AdminDashboardContent |
| `/admin/employers` | Admin | Yes | admin | EmployerVerification |
| `/admin/gdpr` | Admin | Yes | admin | GDPRDashboard |
| `/admin/gdpr/erasure` | Admin | Yes | admin | ErasureRequests |
| `/admin/gdpr/audit` | Admin | Yes | admin | AuditLogs |

---

## Deep Link Support

All routes support direct URL navigation when proper auth state exists. Works on both localhost and Vercel deployment (`vercel.json` SPA rewrites handle client-side routing).

| Route | Works as Direct URL? | Required State |
|-------|---------------------|----------------|
| `/employer/bookings` | Yes | `authenticated-employer` |
| `/employer/employees` | Yes | `authenticated-employer` |
| `/doctor/appointments` | Yes | `authenticated-doctor` |
| `/doctor/schedule` | Yes | `authenticated-doctor` |
| `/admin/gdpr` | Yes | `authenticated-admin` |
| `/admin/employers` | Yes | `authenticated-admin` |

```bash
# Test deep link with saved state
restoreState authenticated-employer
navigate /employer/bookings
wait 1000
snapshot  # Should show Bookings page, not login
```

---

## Pre-Saved States (Quick Start)

Skip authentication and navigation by restoring saved browser states:

| State | Description | Use Case |
|-------|-------------|----------|
| `authenticated-admin` | Admin logged in | Admin GDPR testing |
| `authenticated-employer` | Employer logged in | Employer portal testing |
| `landing-page` | Fresh landing page | Unauthenticated tests |

**Quick start examples:**
```bash
# Start testing as authenticated admin
restoreState authenticated-admin
navigate /admin
snapshot

# Start testing as authenticated employer
restoreState authenticated-employer
navigate /employer/dashboard
snapshot
```

**State storage:** `BROWSER-CLI/states/<name>.json`

---

## Authentication Flow - OccuHealth

**Login Flow (WorkOS AuthKit):**
```bash
# 1. Navigate to app (localhost or Vercel)
navigate localhost:5175           # OR https://convex-medical-starter-phi.vercel.app
snapshot

# 2. Click Provider Login (floating button bottom-right)
click "text:Provider Login"
# -> Login URL includes ?returnTo=${encodeURIComponent(window.location.origin)}
# -> Redirects to WorkOS authentication

# 3. After WorkOS auth, Convex callback reads returnTo from OAuth state
#    and redirects back to the originating domain:
#    - {origin}/admin (if admin user)
#    - {origin}/employer/dashboard (if employer)
#    - {origin}/doctor/dashboard (if doctor)
#    - {origin}/register/choose-role (if new user)
```

**Auth Redirect Chain:**
```
Login button → Convex HTTP action (?returnTo=origin) → WorkOS AuthKit →
Convex callback (reads returnTo from OAuth state) → {origin}/auth/callback
Fallback: returnTo from state → APP_URL env var → http://localhost:5175
```

**Logout Flow:**
```
Sign Out → Convex HTTP action (?returnTo=origin&sessionId=...) →
WorkOS session end → redirect to {origin}
```

**Role-Based Routing:**
| Role | Login Destination | Layout |
|------|------------------|--------|
| Admin | `/admin` | AdminLayout with top nav |
| Employer | `/employer/dashboard` | EmployerLayout with sidebar |
| Doctor | `/doctor/dashboard` | DoctorLayout with sidebar |
| New User | `/register/choose-role` | Role selection page |

---

## Loading States & Verification

### Layout Loading States
All layouts show centered loading spinner during auth check:

| Layout | Loading Indicator | Selector |
|--------|------------------|----------|
| EmployerLayout | "Loading..." text | `text:Loading...` |
| DoctorLayout | "Loading..." text | `text:Loading...` |
| AdminLayout | Spinner animation | `.animate-spin` |
| MainLayout (landing) | Spinner animation | `.animate-spin` |

**Verification after navigate:**
```bash
navigate /employer/dashboard
wait 1000                        # Wait for auth + data
snapshot
assert "text:Dashboard" visible  # Verify page loaded
```

### Route Loading (Suspense Boundaries)
Lazy-loaded routes show spinning loader:
```bash
# Selector: .animate-spin (circular spinner)
# Duration: 200-500ms typical

# Wait for route to load:
waitForSelector "text:Dashboard" --state=visible --timeout=3000
```

---

## Data Loading Patterns (Convex Real-Time)

### Page-by-Page Query Map

| Page | Primary Queries | Console Signature |
|------|-----------------|-------------------|
| Employer Dashboard | `patients.list`, `appointments.listByEmployer`, `reports.listByEmployer` | `CONVEX Q(patients:list)` |
| Employees | `patients.list` | `CONVEX Q(patients:list)` |
| Bookings | `appointments.listByEmployer` | `CONVEX Q(appointments:listByEmployer)` |
| Reports | `reports.listByEmployer` | `CONVEX Q(reports:listByEmployer)` |
| Doctor Dashboard | `appointments.getTodaysAppointments` | `CONVEX Q(appointments:getTodaysAppointments)` |
| Doctor Schedule | `availableSlots.getByDateRange` | `CONVEX Q(availableSlots:getByDateRange)` |
| Admin GDPR | `gdpr.getGDPRStats` | `CONVEX Q(gdpr:getGDPRStats)` |
| Admin Employers | `employers.listPending` | `CONVEX Q(employers:listPending)` |
| Admin Audit | `gdpr.getAuditLogs` | `CONVEX Q(gdpr:getAuditLogs)` |
| Admin Erasure | `gdpr.listErasureRequests` | `CONVEX Q(gdpr:listErasureRequests)` |

### Verify Data Loaded
```bash
# Wait for query to complete (real-time subscription active)
navigate /employer/dashboard
wait 1500
network --filter=convex          # Check Convex websocket active
console                          # Verify no errors
snapshot                         # Check data rendered
```

### Real-Time Update Behavior
All Convex queries are live subscriptions - UI auto-updates when:
- Another user makes changes
- Same user makes changes in another tab
- Backend mutations trigger

**Test real-time:**
```bash
# After mutation, no refresh needed - verify UI updated
snapshot                         # Before mutation
# (perform mutation)
wait 500                         # Brief wait for subscription update
snapshot                         # After - should show changes
```

---

## Empty States

| Page | Empty State Text | Selector |
|------|-----------------|----------|
| Employer Dashboard (appointments) | "No appointments yet" | `text:No appointments yet` |
| Employees | "No employees added yet" | `text:No employees added yet` |
| Bookings | "No bookings yet" | `text:No bookings yet` |
| Reports | "No reports available" | `text:No reports available` |
| Doctor Dashboard | "No appointments today" | `text:No appointments today` |
| Doctor Schedule | "No slots for this date" | `text:No slots for this date` |
| Admin Employer Verification | "No employers pending verification" | `text:No employers pending verification` |
| Admin Audit Logs | "No audit logs" | `text:No audit logs` |
| Admin Erasure Requests | "No pending erasure requests" | `text:No pending erasure requests` |
| GDPR Dashboard (activity) | "No audit activity in the last 7 days" | `text:No audit activity in the last 7 days` |
| GDPR Dashboard (recent logs) | "No recent activity" | `text:No recent activity` |

**Verify empty state:**
```bash
navigate /employer/employees
wait 1000
assert "text:No employees added yet" visible
```

---

## Mutation Patterns & Verification

### Form Submission States

| Form | Button Text (idle) | Button Text (submitting) | Disabled During Submit |
|------|-------------------|-------------------------|----------------------|
| Add Employee | "Add Employee" | "Adding..." | Yes |
| Book Appointment | "Confirm Booking" | "Booking..." | Yes |
| Verify Employer | "Verify" | "Verify" | No |
| Reject Employer | "Reject" | "Reject" | No |
| Process Erasure | "Process Erasure" | "Process Erasure" | No |
| Add Slot | "Add Slot" | "Add Slot" | No |

### Mutation Console Signatures

| Action | Console Signature | Verification |
|--------|------------------|--------------|
| Create employee | `CONVEX M(patients:create)` | `network --filter=patients:create` |
| Create consent | `CONVEX M(gdpr:createConsent)` | `network --filter=gdpr:createConsent` |
| Book appointment | `CONVEX M(appointments:book)` | `network --filter=appointments:book` |
| Verify employer | `CONVEX M(employers:verify)` | `network --filter=employers:verify` |
| Reject employer | `CONVEX M(employers:reject)` | `network --filter=employers:reject` |
| Process erasure | `CONVEX M(gdpr:processErasure)` | `network --filter=gdpr:processErasure` |
| Create slots | `CONVEX M(availableSlots:createSlots)` | `network --filter=availableSlots:createSlots` |
| Block slot | `CONVEX M(availableSlots:blockSlot)` | `network --filter=availableSlots:blockSlot` |

### Complete Mutation Verification
```bash
# Example: Add Employee
click "text:Add Employee"        # Open form
wait 300
snapshot                         # Verify form opened

# Fill form
type 'input[name="firstName"]' "John"
type 'input[name="lastName"]' "Doe"
type 'input[name="email"]' "john@example.com"
type 'input[type="date"]' "1990-01-15"

# Submit
click "text:Add Employee"        # Submit button
wait 500
assertNetwork patients:create    # Verify mutation fired
snapshot                         # Verify dialog closed
assert "text:John Doe" visible   # Verify list updated (real-time)
```

---

## Portal Navigation with Selectors

### Employer Portal Sidebar (EmployerLayout.tsx)

**Structure:** Left sidebar (w-64), fixed position

| Nav Item | Icon | Route | CSS Selector | Text Selector |
|----------|------|-------|--------------|---------------|
| Dashboard | LayoutDashboard | `/employer/dashboard` | `a[href="/employer/dashboard"]` | NavLink with "Dashboard" |
| Employees | Users | `/employer/employees` | `a[href="/employer/employees"]` | NavLink with "Employees" |
| Bookings | Calendar | `/employer/bookings` | `a[href="/employer/bookings"]` | NavLink with "Bookings" |
| Reports | FileText | `/employer/reports` | `a[href="/employer/reports"]` | NavLink with "Reports" |
| Settings | Settings | `/employer/settings` | `a[href="/employer/settings"]` | NavLink with "Settings" |
| Sign Out | LogOut | (logout) | `button:has-text("Sign Out")` | Button at sidebar bottom |

**Active State Styling:** `bg-blue-600 text-white` on active NavLink
**Inactive State:** `hover:bg-slate-100 dark:hover:bg-slate-700`

**Header Elements:**
- Company logo: `text-xl font-bold text-blue-600` "OccuHealth"
- Company name: Employer's companyName from database

```bash
# Navigate employer portal via selectors
click 'a[href="/employer/employees"]'   # CSS selector (most reliable)
# OR
click "text:Employees"                   # Text selector (may match multiple)
```

### Doctor Portal Sidebar (DoctorLayout.tsx)

**Structure:** Left sidebar (w-64), fixed position

| Nav Item | Icon | Route | CSS Selector | Text Selector |
|----------|------|-------|--------------|---------------|
| Dashboard | LayoutDashboard | `/doctor/dashboard` | `a[href="/doctor/dashboard"]` | NavLink with "Dashboard" |
| Appointments | Calendar | `/doctor/appointments` | `a[href="/doctor/appointments"]` | NavLink with "Appointments" |
| Schedule | Clock | `/doctor/schedule` | `a[href="/doctor/schedule"]` | NavLink with "Schedule" |
| Reports | FileText | `/doctor/reports` | `a[href="/doctor/reports"]` | NavLink with "Reports" |
| Settings | Settings | `/doctor/settings` | `a[href="/doctor/settings"]` | NavLink with "Settings" |
| Sign Out | LogOut | (logout) | `button:has-text("Sign Out")` | Button at sidebar bottom |

**Active State Styling:** `bg-blue-600 text-white` on active NavLink
**Inactive State:** `hover:bg-slate-100 dark:hover:bg-slate-700`

**Header Elements:**
- Company logo: `text-xl font-bold text-blue-600` "OccuHealth"
- Doctor name: "Dr. {name}" from doctorSettings

```bash
# Navigate doctor portal
click 'a[href="/doctor/appointments"]'  # CSS selector
wait 500
snapshot
```

### Admin Portal Top Nav (AdminLayout.tsx)

**Structure:** Horizontal header nav (sticky top), NOT sidebar

| Nav Item | Route | CSS Selector | Text Selector |
|----------|-------|--------------|---------------|
| OccuHealth Logo | `/` | `a[href="/"]` | Links to home |
| Admin Badge | - | `span.bg-primary/10` | "Admin" badge |
| Dashboard | `/admin` | `a[href="/admin"]` | "Dashboard" link |
| Employers | `/admin/employers` | `a[href="/admin/employers"]` | "Employers" link |
| GDPR | `/admin/gdpr` | `a[href="/admin/gdpr"]` | "GDPR" link |
| Sign Out | (logout) | `button:has-text("Sign Out")` | Outline button in header |

**Dashboard Card Links:**
| Card | Route | CSS Selector |
|------|-------|--------------|
| Employer Verification | `/admin/employers` | `a[href="/admin/employers"].bg-card` |
| GDPR Compliance | `/admin/gdpr` | `a[href="/admin/gdpr"].bg-card` |
| Audit Logs | `/admin/gdpr/audit` | `a[href="/admin/gdpr/audit"].bg-card` |

```bash
# Navigate admin portal
click 'a[href="/admin/employers"]'      # Header nav link
# OR
click 'a[href="/admin/gdpr/audit"]'     # Dashboard card
```

### Landing Page Header Navigation (NavigationBar.tsx)

**Structure:** Sticky header with responsive mobile menu

| Element | Type | Target | CSS Selector |
|---------|------|--------|--------------|
| Logo (Stethoscope) | Link | `/` | `a[href="/"]` |
| Features | Anchor | `#features` | `a[href="#features"]` |
| Testimonials | Anchor | `#testimonials` | `a[href="#testimonials"]` |
| Pricing | Anchor | `#pricing` | `a[href="#pricing"]` |
| About | Anchor | `#about` | `a[href="#about"]` |
| Login | Button | WorkOS Auth | `text:Login` button |
| Request Demo | Button | WorkOS Auth | `text:Request Demo` button |

**Floating Button:**
- Provider Login: Fixed bottom-right, `text:Provider Login`

```bash
# Landing page navigation
click 'a[href="#features"]'             # Scroll to features section
click "text:Login"                       # Initiate WorkOS login
```

---

## Employer-Specific Flows

### Pending Verification State
Employers pending verification see a warning banner:

```bash
navigate /employer/dashboard
snapshot
# If not verified, look for:
assert "text:Account Pending Verification" visible
assert "text:Some features are restricted" visible
```

**Booking disabled when not verified:**
```bash
navigate /employer/bookings
snapshot
assert "text:Booking is disabled until your account is verified" visible
# "New Booking" button is disabled
```

### Booking Flow (Multi-Step)
```bash
# 1. Open booking dialog
navigate /employer/bookings
click "text:New Booking"
wait 500
snapshot                         # Step 1: Select Employee

# 2. Select employee from dropdown
click "select"                   # Employee dropdown
click "text:John Doe"            # Select employee
# Select appointment type
click "select"                   # Type dropdown
click "text:Initial Assessment"  # Select type
click "text:Next"
wait 300
snapshot                         # Step 2: Select Date/Time

# 3. Select date and slot
type 'input[type="date"]' "2026-02-15"
wait 500                         # Wait for slots to load
click "text:09:00"               # Select time slot
click "text:Next"
wait 300
snapshot                         # Step 3: Confirm

# 4. Add reason and confirm
type 'input[placeholder*="reason"]' "Annual health check"
click "text:Confirm Booking"
wait 500
assertNetwork appointments:book  # Verify mutation
snapshot                         # Dialog closes, list updated
```

---

## Admin-Specific Flows

### Employer Verification
```bash
navigate /admin/employers
wait 1000
snapshot

# If pending employers exist:
# Each employer card has Verify and Reject buttons
click "text:Verify"              # Approve employer
wait 300
assertNetwork employers:verify
snapshot                         # Employer removed from pending list
```

### GDPR Erasure Processing
```bash
navigate /admin/gdpr/erasure
wait 1000
snapshot

# If pending erasure requests:
click "text:Process Erasure"
wait 300
assertNetwork gdpr:processErasure
snapshot                         # Request processed
```

---

## Doctor-Specific Flows

### Schedule Management
```bash
navigate /doctor/schedule
wait 1000
snapshot

# Add a time slot
type 'input[type="date"]' "2026-02-15"
type 'input[type="time"]:first-of-type' "09:00"   # Start time
type 'input[type="time"]:last-of-type' "09:30"    # End time
click "text:Add Slot"
wait 300
assertNetwork availableSlots:createSlots
snapshot                         # New slot appears in grid

# Block a slot
click "text:Block"               # On available slot
wait 300
assertNetwork availableSlots:blockSlot
snapshot                         # Slot shows as blocked (gray)
```

---

## Route Guards & Redirects

### Guard Behavior by Portal

| Route Pattern | Guard Hook | Check | Unauthorized Result |
|---------------|------------|-------|---------------------|
| `/employer/*` | `useEmployerAuth()` | `isAuthenticated` | `<Navigate to="/" replace />` |
| `/doctor/*` | `useDoctorAuth()` | `isAuthenticated` | `<Navigate to="/" replace />` |
| `/admin/*` | `useAdminAuth()` | `isAdminAuthenticated` | Shows "Admin Access Required" page |

**Key Difference:** Admin portal does NOT redirect - it shows an inline login CTA.

### Auth Storage Keys

| Role | localStorage Key | Token Fields |
|------|-----------------|--------------|
| Admin | `workos_admin_auth` | userId, accessToken, refreshToken, sessionId |
| Employer | `workos_employer_auth` | workosUserId, accessToken, refreshToken |
| Doctor | `workos_doctor_auth` | workosUserId, accessToken, refreshToken |

### Pending Employer Restrictions

When employer `status !== "verified"`:
- Shows yellow warning banner on all employer pages
- Booking functionality is disabled
- `isVerified` context flag is `false`

```bash
# Test pending verification state
restoreState authenticated-employer-pending
navigate /employer/dashboard
snapshot
assert "text:Account Pending Verification" visible
assert "text:Some features are restricted" visible
```

---

## Programmatic Navigation Patterns

### useNavigate() Destinations

| File | Trigger | Destination |
|------|---------|-------------|
| AdminAuthCallback.tsx | Auth success | `redirectPath` param OR `/admin` |
| ChooseRole.tsx | Employer card click | `/register/employer?accessToken=...&userId=...` |
| ChooseRole.tsx | Doctor card click | `/register/doctor?accessToken=...&userId=...` |
| ChooseRole.tsx | Back button | `/` |
| EmployerRegistrationForm.tsx | Registration complete | `/employer` |

### <Navigate> Redirect Components

| File | Condition | Redirect To |
|------|-----------|-------------|
| EmployerLayout.tsx | `!isAuthenticated` | `/` |
| DoctorLayout.tsx | `!isAuthenticated` | `/` |

### <a href> Link Patterns

| Context | Example | Notes |
|---------|---------|-------|
| Admin nav | `<a href="/admin/employers">` | Uses href, not react-router Link |
| Dashboard cards | `<a href="/admin/gdpr">` | Uses href, not react-router Link |
| Auth buttons | `window.location.href = Convex HTTP action + ?returnTo=origin` | Full page redirect via Convex to WorkOS |

### Auth Callback Flow

```
1. User clicks login button
2. window.location.href -> Convex HTTP action with ?returnTo=origin
3. Convex stores returnTo in OAuth state, redirects to WorkOS AuthKit
4. WorkOS authenticates user
5. Convex callback reads returnTo from OAuth state
6. Redirect to {returnTo}/auth/callback?accessToken=...&userId=...&sessionId=...
7. AdminAuthCallback extracts tokens, calls loginAsAdmin()
8. navigate(redirectPath || "/admin")
```

---

## Error Handling & Recovery

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Auth loading stuck | Spinner for >5s | Refresh page, clear localStorage |
| State restore fails | "State not found" | `listStates` to verify, use manual login |
| Data not loading | Empty state persists, no network | Check Convex websocket in network tab |
| Mutation failed | Console error, no UI update | `console` to see error, check network |
| Modal not opening | Click has no effect | `wait 300`, fresh `snapshot`, retry |
| Pending verification | Banner visible | Admin must verify at /admin/employers |
| Route guard redirect | Unexpected landing page | Check localStorage for auth tokens |
| Token expired | Redirect to login | Clear auth storage, re-authenticate |

**Debug Commands:**
```bash
console                          # Check for React/Convex errors
network --filter=convex          # Verify Convex connection
network --status=400             # Find failed requests
snapshot --full                  # See element states
```

---

## Network Verification Commands

```bash
# Verify Convex real-time connection
network --filter=convex

# Verify specific query loaded
network --filter=patients:list

# Verify mutation completed
assertNetwork appointments:book

# Check for failures
network --status=400
network --status=500

# Verify after critical actions
snapshot
console
network --filter=convex
```

---

## Key Selectors Reference

### Landing Page
| Element | Selector |
|---------|----------|
| Provider Login button | `text:Provider Login` |
| Hero section | `text:Occupational Health` or `text:OccuHealth` |

### Employer Portal
| Element | Selector |
|---------|----------|
| Add Employee button | `text:Add Employee` |
| New Booking button | `text:New Booking` |
| Verification banner | `text:Account Pending Verification` |
| Employee list | `.divide-y` |
| Appointment card | `.p-4.border.rounded-lg` |

### Admin Portal
| Element | Selector |
|---------|----------|
| Admin badge | `text:Admin` |
| Verify button | `text:Verify` |
| Reject button | `text:Reject` |
| Process Erasure button | `text:Process Erasure` |
| Stats cards | `.grid.md\\:grid-cols-4` |

### Forms (common)
| Element | Selector |
|---------|----------|
| Dialog | `role:dialog` |
| Submit button | `button[type="submit"]` |
| Cancel button | `text:Cancel` |
| Date input | `input[type="date"]` |
| Email input | `input[type="email"]` |

---

## Console Signatures (Expected)

**Queries (real-time subscriptions):**
```
CONVEX Q(employers:getByWorkosIdPublic)
CONVEX Q(patients:list)
CONVEX Q(appointments:listByEmployer)
CONVEX Q(reports:listByEmployer)
CONVEX Q(gdpr:getGDPRStats)
```

**Mutations:**
```
CONVEX M(patients:create)
CONVEX M(gdpr:createConsent)
CONVEX M(appointments:book)
CONVEX M(employers:verify)
CONVEX M(employers:reject)
CONVEX M(gdpr:processErasure)
CONVEX M(availableSlots:createSlots)
```

**Known Warnings (Non-blocking):**
- `Missing Description or aria-describedby for DialogContent` - Radix UI accessibility warning

---

## Advanced Commands Reference

**Verification & Assertions:**
```bash
assert e5 visible                # Check element visible
assert e5 text "Dashboard"       # Check element text
assertConsole --level=error      # Verify no console errors
assertNetwork patients:create    # Verify mutation occurred
```

**Network Inspection:**
```bash
network                          # List all requests
network --filter=convex          # Filter Convex API calls
network --status=400             # Find failed requests
network --method=POST            # Filter by method
```

**State Management:**
```bash
listStates                       # Show all saved states
saveState my-test-state          # Save current state
restoreState authenticated-admin # Restore saved state
deleteState old-state            # Remove saved state
```

**Evidence Collection:**
```bash
screenshot before-test.png       # Visual capture
snapshot --file=baseline         # Save snapshot to file
snapshot --full                  # Include element states
snapshot --forms                 # Analyze form fields
```

**Debug Commands:**
```bash
console                          # Show browser console
clearConsole                     # Clear console buffer
evaluate 'document.title'        # Read-only JS inspection
getElementVisibility '[selector]' # Check element visibility
```

For complete command reference, see `BROWSER-CLI/SKILL.md`.

---

## Security & Privacy Notes

### Safe Test Data
- Use fictional company names ("Test Corp", "Demo Ltd")
- Use test@example.com email format
- Use fictional dates of birth (1990-01-01)
- No real employee information
- No actual medical conditions in reports

### Do NOT Include in Tests
- Real patient names or PII
- Real health conditions or findings
- Screenshots showing medical data
- Unmasked JWT tokens
- Production API keys

### Auth Token Storage
```
localStorage keys:
├── workos_admin_auth     → {userId, accessToken, refreshToken, sessionId}
├── workos_employer_auth  → {workosUserId, accessToken, refreshToken}
└── workos_doctor_auth    → {workosUserId, accessToken, refreshToken}
```

### GDPR Compliance in Testing
All actions are audit-logged. Testable workflows:
- Consent creation during employee registration
- Audit log entries for all mutations
- Erasure request processing

---

## Known Limitations (2026-02-09)

### Active Bugs

| Bug | Severity | Impact | Workaround |
|-----|----------|--------|------------|
| **BUG-001** | Critical | Token loss during registration | Use saved states instead |
| **BUG-002** | High | Admin UI visible to non-admins | Backend protected, UX only |
| **BUG-003** | Medium | WorkOS session persists after logout | Restart browser |

### Resolved Bugs

| Bug | Resolution | Commit |
|-----|-----------|--------|
| Auth redirect to localhost from Vercel | Fixed via dynamic `returnTo` origin passthrough | `c724a67` |

### Routing Gaps

Employer and Doctor portals have **orphaned pages**:
- Pages exist in `src/pages/employer/` and `src/pages/doctor/`
- Routes NOT wired in layout components (missing `<Routes>` blocks)
- Navigation may show empty content

**Workaround**: Use direct URL navigation + page refresh if needed

### Missing Test Infrastructure

- **Zero `data-testid` attributes** in codebase
- Browser-CLI selectors rely on refs and text content
- Use `snapshot` refs or semantic selectors

---

## Modal Interaction Patterns

### BookingFlow (3-Step Wizard)

**Location:** `/employer/bookings`
**Trigger:** "New Booking" button

```bash
# Step 1: Select Employee & Type
click "text:New Booking"
wait 500
snapshot  # Verify "Book Appointment - Step 1 of 3"

selectOption "select:first" "patient_id"  # Employee
selectOption "select:nth(2)" "type_id"    # Type
click "text:Next"
wait 300

# Step 2: Date & Time Slot
type "input[type='date']" "2026-01-15"
wait 500  # Slots load
click e10  # Time slot button
click "text:Next"
wait 300

# Step 3: Review & Confirm
type "input:placeholder('reason')" "Annual checkup"
click "text:Confirm Booking"
wait 1500
snapshot  # Modal closed
```

**Timing:** 500ms after open, 500ms after date change, 1500ms after confirm

### EmployeeForm (Add Employee)

**Location:** `/employer/employees`
**Trigger:** "Add Employee" button

```bash
click "text:Add Employee"
wait 500
snapshot

type e3 "John"           # First Name
type e4 "Smith"          # Last Name
type e5 "john@test.com"  # Email
type e6 "1990-01-01"     # DOB

click "text:Add Employee"  # Submit
wait 1000
snapshot
```

### CreateReport (Doctor)

**Location:** `/doctor/reports`
**Trigger:** "Create Report" button per row

```bash
click e5  # Create Report button
wait 500

selectOption "select" "fit_with_restrictions"
type "textarea" "Patient healthy. Minor RSI symptoms."
click "input[type='checkbox']"  # Follow-up required
wait 300
type "textarea:nth(2)" "Review in 3 months."

click "text:Submit & Send to Employer"
wait 1500
```

---

## Complete Testing Workflow

```bash
# 1. Setup
restoreState authenticated-employer
navigate /employer/dashboard
wait 500
snapshot

# 2. Navigate
click "text:Employees"
wait 300
snapshot

# 3. Perform action
click "text:Add Employee"
wait 500
snapshot --forms

# 4. Fill and submit
type e3 "Test"
type e4 "User"
type e5 "test@example.com"
type e6 "1990-01-01"
click "text:Add Employee"
wait 1000

# 5. Verify
snapshot
network --filter=patients:create
assertConsole --level=error
screenshot employee-added.png
```
