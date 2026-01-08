# AI Report Generation - Overview & Prerequisites

**Sprint**: 01 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: None
**Next**: AI_REPORT_GEN_SPRINT_02_BACKEND

---

## Objective

Enable GPT-5-mini powered report generation for doctors in OccuHealth. AI assists with:
- Fitness-for-work summary drafting
- Workplace restriction suggestions
- Follow-up recommendations

## Current State Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| Reports schema | ✅ Ready | 11 fields verified |
| Patient context | ✅ Ready | jobTitle, department, dateOfBirth |
| Appointments context | ✅ Ready | reasonForAppointment, preAppointmentNotes |
| Auth guards | ✅ Ready | 100% coverage on mutations |
| Audit logging | ⚠️ 40% | Needs expansion for AI actions |
| OpenAI SDK | ❌ Missing | Not installed |
| API Key | ✅ Configured | In .env.local |

## Prerequisites Checklist

### P0: Critical (Before Any Sprint)

- [ ] **Install OpenAI SDK**
  ```bash
  npm install openai
  ```

- [ ] **Rotate API Keys** (Security Issue)
  - Current keys exposed in git history
  - Rotate via OpenAI dashboard
  - Rotate via WorkOS dashboard
  - Purge .env.local from git history

- [ ] **Verify Environment**
  ```bash
  # Check .env.local has:
  OPENAI_API_KEY=sk-proj-...
  OPENAI_MODEL_SUGGESTIONS=gpt-5-mini
  ```

### P1: Required Infrastructure

- [ ] **Extend `reports` table schema** (`convex/schema.ts`):
  ```typescript
  // Add these 3 optional fields to the existing reports table definition
  aiAssisted: v.optional(v.boolean()),
  aiAccepted: v.optional(v.boolean()),
  aiModified: v.optional(v.boolean()),
  ```

- [ ] **Verify `clinicalNotes` table exists** (should already be in schema):
  ```typescript
  clinicalNotes: defineTable({
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    findings: v.string(),
    diagnosis: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_appointment", ["appointmentId"]),
  ```

- [ ] **Create `convex/actions/` directory** (if not exists):
  ```bash
  mkdir -p convex/actions
  ```

- [ ] Add AI error codes to `convex/lib/errorCodes.ts`:
  ```typescript
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_RESPONSE_MALFORMED: "AI_RESPONSE_MALFORMED",
  AI_RESPONSE_EMPTY: "AI_RESPONSE_EMPTY",
  AI_TIMEOUT: "AI_TIMEOUT",
  ```

## Architecture Overview

```
Doctor Portal → Convex Action → OpenAI API → Parse Response → Update Report
     │              │               │              │             │
     │              │               │              │             │
  [Generate]    [Context]     [GPT-5-mini]   [Validate]    [Audit Log]
   Button       Loading        API Call       JSON          Compliance
```

## Token Budgets

| Field | max_completion_tokens | Use Case |
|-------|----------------------|----------|
| Restrictions | 300 | 3-5 short strings |
| Summary | 800 | 2-3 paragraphs |
| Follow-up notes | 200 | Brief recommendation |
| Combined | 1500 | All fields at once |

## Acceptance Criteria

- [ ] OpenAI SDK installed and importable
- [ ] API keys rotated and secured
- [ ] Error codes added to errorCodes.ts
- [ ] Development environment verified working

---

→ Next: AI_REPORT_GEN_SPRINT_02_BACKEND
