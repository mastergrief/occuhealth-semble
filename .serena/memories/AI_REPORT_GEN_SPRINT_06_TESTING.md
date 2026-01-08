# AI Report Generation - Browser-CLI Manual Testing

**Sprint**: 06 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: AI_REPORT_GEN_SPRINT_04_FRONTEND
**Next**: Complete

---

## Objective

Validate AI report generation functionality through Browser-CLI manual testing. Test the complete workflow from doctor login to AI-assisted report creation.

## Prerequisites

1. Dev servers running: `npm run dev` (Vite on 5175, Convex on 5176)
2. Browser-CLI available: `npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts`
3. Test doctor account: `testdoc@occuhealth.com` / `(TestPass1234`
4. At least one completed appointment without a report

## Initial Setup: Create Saved Auth State

**Important**: Before running tests, create and save an authenticated doctor state to avoid manual login each time.

```bash
# 1. Start browser
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5175

# 2. Manually authenticate as doctor:
#    - Click "Provider Login"
#    - Complete WorkOS authentication with testdoc@occuhealth.com
#    - Wait for redirect to /doctor/dashboard

# 3. Save the authenticated state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts saveState authenticated-doctor

# 4. Verify state saved
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts listStates
# Should show: authenticated-doctor
```

Now you can restore this state at the start of any test:
```bash
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts restoreState authenticated-doctor
```

## Test Scenarios

### Test 1: Doctor Login & Navigation to Reports

```bash
# Start browser and navigate
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5175
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify landing page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:OccuHealth" visible

# Click Provider Login
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Provider Login"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000

# After WorkOS auth, should be on doctor dashboard
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T1_doctor_dashboard.png

# Navigate to Reports page
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click 'a[href="/doctor/reports"]'
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 1000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T1_reports_page.png
```

**Expected**: Doctor Reports page shows list of completed appointments awaiting reports.

### Test 2: Open Report Dialog & View AI Button

```bash
# Click Create Report on first pending appointment
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
# Find the Create Report button (ref from snapshot)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Create Report"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify dialog opened
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "role:dialog" visible

# Verify AI button exists
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Generate with AI" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T2_report_dialog_with_ai_button.png
```

**Expected**: Dialog shows "Generate with AI" button at top.

### Test 3: Generate AI Suggestion

```bash
# Click Generate with AI
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Generate with AI"

# Verify loading state
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:Generating" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T3_ai_loading.png

# Wait for AI response (up to 10 seconds)
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 10000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify AI suggestion panel appeared
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:AI Suggestion" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assert "text:confidence" visible
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T3_ai_suggestion.png
```

**Expected**: AI suggestion panel shows with fitness status, summary, and restrictions.

### Test 4: Accept AI Suggestion

```bash
# Click Accept button
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Accept"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify form populated with AI values
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot --forms
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T4_form_populated.png

# Verify summary textarea has content
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate 'document.querySelector("textarea")?.value?.length > 0'
```

**Expected**: Form fields populated with AI-suggested values. Summary textarea has content.

### Test 5: Submit Report with AI Metadata

```bash
# Submit the report
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Submit"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify dialog closed
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T5_after_submit.png

# Check console for any errors
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts console

# Verify network call to reports:createWithAI
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts network --filter=reports
```

**Expected**: Report created, dialog closed, no console errors.

### Test 6: Edit AI Suggestion Before Submit

```bash
# Repeat Test 2-3 to get AI suggestion
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Create Report"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Generate with AI"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 10000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click Edit & Use
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Edit"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Modify the summary
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot --forms
# Get textarea ref from snapshot and add text
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts type "textarea" " - Modified by doctor."
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T6_modified_summary.png

# Submit
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Submit"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 2000
```

**Expected**: Report saved with aiModified=true in audit log.

### Test 7: Reject AI Suggestion

```bash
# Get AI suggestion
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Create Report"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Generate with AI"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 10000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Click Ignore
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Ignore"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 300
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Verify AI panel hidden
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T7_ai_rejected.png

# Form should be empty
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts evaluate 'document.querySelector("textarea")?.value === ""'
```

**Expected**: AI suggestion panel disappears, form remains empty for manual entry.

### Test 8: AI Error Handling

```bash
# If API key invalid or rate limited, test error state
# (Simulate by temporarily changing OPENAI_API_KEY)

npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Create Report"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 500
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts click "text:Generate with AI"
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts wait 15000
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot

# Check for error message
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot T8_ai_error.png
```

**Expected**: User-friendly error message displayed, no crash.

## Verification Commands

### Check Audit Logs for AI Usage

```bash
# Query audit logs via Convex CLI
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=10 --json | jq '.data[] | select(.action | contains("ai"))'
```

### Check Cache Stats

```bash
# Query cache stats
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts aiHelpers:getCacheStats '{}' --json
```

### Verify Report Has AI Metadata

```bash
# Query recent reports
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts reports --limit=5 --json | jq '.data[] | {id: ._id, aiAssisted, aiAccepted, aiModified}'
```

## Test Evidence Checklist

| Test | Screenshot | Network Verified | Console Clean |
|------|------------|------------------|---------------|
| T1 Login | T1_doctor_dashboard.png | N/A | - |
| T2 Dialog | T2_report_dialog_with_ai_button.png | N/A | - |
| T3 Generate | T3_ai_suggestion.png | ai action called | - |
| T4 Accept | T4_form_populated.png | N/A | - |
| T5 Submit | T5_after_submit.png | reports:createWithAI | No errors |
| T6 Modify | T6_modified_summary.png | reports:createWithAI | No errors |
| T7 Reject | T7_ai_rejected.png | N/A | - |
| T8 Error | T8_ai_error.png | error logged | Error displayed |

## Full Test Script

Save as `BROWSER-CLI/tests/ai-report-test.sh`:

```bash
#!/bin/bash
set -e

CMD="npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts"

echo "=== AI Report Generation Test Suite ==="

# Setup
$CMD start http://localhost:5175
sleep 2

# Test 1: Login flow (manual - requires WorkOS)
echo "Test 1: Navigate to Reports page"
$CMD restoreState authenticated-doctor 2>/dev/null || echo "No saved state, manual login required"
$CMD navigate http://localhost:5175/doctor/reports
$CMD wait 2000
$CMD snapshot
$CMD screenshot evidence/T1_reports.png

# Test 2: Open dialog
echo "Test 2: Open report dialog"
$CMD click "text:Create Report"
$CMD wait 1000
$CMD snapshot
$CMD assert "text:Generate with AI" visible
$CMD screenshot evidence/T2_dialog.png

# Test 3: Generate AI
echo "Test 3: Generate AI suggestion"
$CMD click "text:Generate with AI"
$CMD wait 12000
$CMD snapshot
$CMD screenshot evidence/T3_ai_result.png

# Test 4: Accept and submit
echo "Test 4: Accept suggestion"
$CMD click "text:Accept"
$CMD wait 500
$CMD snapshot
$CMD click "text:Submit"
$CMD wait 3000
$CMD screenshot evidence/T4_submitted.png

# Cleanup
$CMD console
echo "=== Tests Complete ==="
```

## Acceptance Criteria

- [ ] Doctor can navigate to Reports page
- [ ] "Generate with AI" button visible in report dialog
- [ ] AI suggestion loads within 10-15 seconds
- [ ] Suggestion panel shows fitness, summary, restrictions
- [ ] Accept populates form correctly
- [ ] Edit & Use allows modifications
- [ ] Ignore clears suggestion panel
- [ ] Submit saves report with AI metadata
- [ ] Error states handled gracefully
- [ ] All evidence screenshots captured
- [ ] Audit logs contain AI tracking data

---

✓ Final Sprint
