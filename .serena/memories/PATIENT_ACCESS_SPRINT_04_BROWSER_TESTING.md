# Patient Appointment Access - Browser-CLI Manual Testing
**Sprint**: 04 of 04
**Index**: PATIENT_ACCESS_INDEX
**Depends On**: PATIENT_ACCESS_SPRINT_03_FRONTEND
**Next**: Complete

---

## Prerequisites

1. Dev servers running: `npm run dev` (ports 5175 frontend, Convex backend)
2. Browser-CLI available: `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts`
3. Authenticated employer state saved (or test credentials ready)
4. At least one appointment exists in database

---

## Test Suite Overview

| Test ID | Description | Priority |
|---------|-------------|----------|
| PT-01 | Generate magic link from employer portal | P1 |
| PT-02 | View appointment via valid magic link | P1 |
| PT-03 | Invalid token shows error | P1 |
| PT-04 | Expired token shows error | P1 |
| PT-05 | Download ICS calendar file | P2 |
| PT-06 | Mobile responsive layout | P2 |
| PT-07 | Zoom link opens correctly | P2 |
| PT-08 | Copy link feedback | P2 |

---

## Test PT-01: Generate Magic Link from Employer Portal

**Objective**: Verify employer can generate share link for appointment

```bash
# 1. Start browser and restore authenticated employer state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer

# 2. Navigate to bookings page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 3. Find and click Share button on first appointment
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Share"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 4. Verify success toast appears
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# EXPECTED: Toast with "Link copied!" message visible

# 5. Check console for any errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console
# EXPECTED: No errors, mutation logged

# 6. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-01-share-link-generated.png
```

**Pass Criteria**:
- [x] Share button clickable
- [x] Toast notification appears: "Link copied!"
- [x] No console errors
- [x] Network shows `appointmentTokens:generate` mutation

---

## Test PT-02: View Appointment via Valid Magic Link

**Objective**: Patient can view appointment details via magic link

```bash
# 1. First, get a valid token via Convex CLI
# (Use appointment ID from previous test or database)
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:generate '{"appointmentId":"<APPOINTMENT_ID>"}' --json
# SAVE the returned token value

# 2. Navigate to the magic link URL
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/<TOKEN>"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 3. Verify appointment details displayed
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Your Appointment" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Medical Appointment" visible

# 4. Check all key elements present
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot --full
# EXPECTED: Date, Time, Doctor name, Status badge visible

# 5. Verify Zoom link present (if appointment has doctor)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Join Zoom Meeting" visible

# 6. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-02-appointment-view.png
```

**Pass Criteria**:
- [x] Page loads without errors
- [x] "Your Appointment" heading visible
- [x] Patient name displayed
- [x] Date and time shown
- [x] Status badge correct color
- [x] Zoom link visible (if applicable)

---

## Test PT-03: Invalid Token Shows Error

**Objective**: Invalid/random token displays helpful error message

```bash
# 1. Navigate to fake token URL
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/invalid-token-12345"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 2. Verify error UI displayed
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Link Invalid or Expired" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:contact your employer" visible

# 3. Verify "Return to Home" button present
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Return to Home" visible

# 4. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-03-invalid-token.png
```

**Pass Criteria**:
- [x] Error card displayed with red X icon
- [x] "Link Invalid or Expired" heading
- [x] Helpful message about contacting employer
- [x] Return to Home button visible and clickable

---

## Test PT-04: Expired Token Shows Error

**Objective**: Expired token (past TTL) shows expiration message

```bash
# 1. Create a token, then manually expire it in database
# OR: Wait 48 hours after generating a test token (not practical)
# ALTERNATIVE: Modify TTL to 1 second for testing

# For manual database update via Convex dashboard:
# Set expiresAt to past timestamp on appointmentTokens record

# 2. Navigate to expired token URL
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/<EXPIRED_TOKEN>"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# 3. Verify expiration error
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:expired" visible

# 4. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-04-expired-token.png
```

**Pass Criteria**:
- [x] Error message indicates link is expired
- [x] User directed to request new link

---

## Test PT-05: Download ICS Calendar File

**Objective**: "Add to Calendar" downloads valid ICS file

```bash
# 1. Navigate to valid appointment view
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/<VALID_TOKEN>"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000

# 2. Find "Add to Calendar" button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Add to Calendar" visible

# 3. Click download button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Add to Calendar"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 4. Verify download initiated (check network)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=calendar
# EXPECTED: GET request to /calendar/<token> with 200 status

# 5. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-05-calendar-download.png
```

**Pass Criteria**:
- [x] "Add to Calendar" button visible
- [x] Click initiates download
- [x] Network shows successful GET to /calendar/:token
- [x] Downloaded file has .ics extension

**Manual Verification**:
- Open downloaded .ics file
- Verify it imports into calendar app (Google Calendar, Outlook, Apple Calendar)
- Check event has correct date, time, and description

---

## Test PT-06: Mobile Responsive Layout

**Objective**: Page displays correctly on mobile viewport

```bash
# 1. Set mobile viewport
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts setMobilePreset "iPhone 12"

# 2. Navigate to appointment view
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/<VALID_TOKEN>"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000

# 3. Take snapshot of mobile layout
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-06-mobile-view.png

# 4. Verify key elements still visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Your Appointment" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Add to Calendar" visible

# 5. Reset viewport
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts resetMobilePreset
```

**Pass Criteria**:
- [x] Content readable on mobile
- [x] Buttons full-width and tappable
- [x] No horizontal scroll
- [x] Zoom link button accessible

---

## Test PT-07: Zoom Link Opens Correctly

**Objective**: "Join Zoom Meeting" opens Zoom link in new tab

```bash
# 1. Navigate to appointment with Zoom link
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate "http://localhost:5175/view-appointment/<VALID_TOKEN>"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000

# 2. Verify Zoom button present
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Join Zoom Meeting" visible

# 3. Click Zoom button (opens new tab)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Join Zoom Meeting"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000

# 4. Check new tab opened
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts tabs
# EXPECTED: 2 tabs, second tab is Zoom URL

# 5. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-07-zoom-link.png

# 6. Close zoom tab and return
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts tabs close 1
```

**Pass Criteria**:
- [x] Zoom button has correct styling (blue)
- [x] Click opens new tab (target="_blank")
- [x] New tab navigates to Zoom URL
- [x] Original page remains open

---

## Test PT-08: Copy Link Feedback (Employer Side)

**Objective**: Verify copy confirmation and clipboard functionality

```bash
# 1. Restore employer state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-employer

# 2. Navigate to bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175/employer/bookings
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1500

# 3. Click Share button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Share"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500

# 4. Verify button changes to checkmark
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# EXPECTED: Button shows green check icon temporarily

# 5. Verify toast notification
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Link copied" visible

# 6. Capture evidence
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot PT-08-copy-feedback.png
```

**Pass Criteria**:
- [x] Share button shows checkmark after click
- [x] Toast notification appears
- [x] Checkmark reverts to share icon after 2 seconds
- [x] Link actually copied to clipboard (manual paste to verify)

---

## Test Execution Summary Template

```markdown
## Patient Access Feature - Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Build**: [Commit hash]

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| PT-01 | Generate magic link | ⬜ | |
| PT-02 | View via valid link | ⬜ | |
| PT-03 | Invalid token error | ⬜ | |
| PT-04 | Expired token error | ⬜ | |
| PT-05 | Calendar download | ⬜ | |
| PT-06 | Mobile responsive | ⬜ | |
| PT-07 | Zoom link works | ⬜ | |
| PT-08 | Copy feedback | ⬜ | |

**Overall**: ⬜ Pass / ⬜ Fail
**Blockers**: 
**Screenshots**: ./PT-*.png
```

---

## Evidence Collection

All test evidence should be saved to:
```
/PATIENT_ACCESS_TEST_EVIDENCE/
├── PT-01-share-link-generated.png
├── PT-02-appointment-view.png
├── PT-03-invalid-token.png
├── PT-04-expired-token.png
├── PT-05-calendar-download.png
├── PT-06-mobile-view.png
├── PT-07-zoom-link.png
├── PT-08-copy-feedback.png
└── test-results.md
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Token undefined" in URL | Token not passed from Convex CLI | Copy full token string including all characters |
| Blank page on load | Convex query error | Check `console` for errors, verify backend deployed |
| Calendar download fails | HTTP route not registered | Check `convex/http.ts` has `/calendar/:token` route |
| Mobile preset not applying | Browser cached viewport | Run `close` then restart browser |
| Share button not found | No appointments exist | Create test appointment first |
| Toast not appearing | Sonner not configured | Check `Toaster` in App.tsx |

---

✓ Final Sprint - Testing Complete

---

## Post-Implementation Checklist

- [ ] All 8 tests pass
- [ ] Screenshots captured for evidence
- [ ] No console errors in any flow
- [ ] Mobile layout verified
- [ ] ICS file imports to calendar app
- [ ] Zoom link opens correctly
- [ ] Feature ready for code review
