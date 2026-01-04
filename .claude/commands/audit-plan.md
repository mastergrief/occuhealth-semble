# AUDIT-PLAN - Discovery & Test Design Phase

**Purpose**: Phase 0-2 of audit - discover codebase context and design test plan
**Output**: `pending-audit.json` in context hub for `/audit-execute` to consume
**Mode**: Any
**Arguments**: `$ARGUMENTS` = Target to audit (e.g., "doctor portal", "employer bookings")
**Agents**: 2 Explore (haiku, parallel) → 1 Plan (sonnet)

---

## STEP 0: CLARIFICATION

On submission of `$ARGUMENTS`, use `AskUserQuestion` to clarify:

```python
AskUserQuestion(
  questions=[
    {
      "question": "What is the scope of this audit?",
      "header": "Scope",
      "options": [
        {"label": "Entire portal", "description": "All tabs and features for this role"},
        {"label": "Specific tab", "description": "Single tab/page deep dive"},
        {"label": "Single feature", "description": "One feature across the stack"},
        {"label": "Cross-cutting", "description": "Auth, navigation, or similar"}
      ],
      "multiSelect": False
    },
    {
      "question": "What depth of testing?",
      "header": "Depth",
      "options": [
        {"label": "Quick health check (Recommended)", "description": "Load each page, check for errors"},
        {"label": "Comprehensive", "description": "Test all interactions and edge cases"},
        {"label": "Regression", "description": "Focus on previously broken areas"}
      ],
      "multiSelect": False
    }
  ]
)
```

**Do NOT proceed until scope is confirmed!**

---

## STEP 1: SCOUT (2 Explore Agents - Parallel)

### 1.1 Launch 2 Explore Agents (SINGLE message, foreground)

```python
# Agent 1 - Frontend Discovery
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="""
  AUDIT SCOUT 1/2: Frontend Discovery for {$ARGUMENTS}

  Find ALL UI-related files for this audit target:

  1. **Layout & Routes**:
     - Layout component (e.g., DoctorLayout.tsx, EmployerLayout.tsx)
     - Route definitions in App.tsx
     - Navigation structure (tabs, sidebar items)

  2. **Page Components**:
     - All pages under relevant directory (src/pages/{role}/*.tsx)
     - What each page is supposed to do
     - UI components used

  3. **Auth Context**:
     - Auth hooks used
     - Token storage keys
     - Guard behavior

  4. **Feature Inventory** (per page):
     - Forms and their fields
     - Buttons and their actions
     - Data displays (tables, cards, lists)
     - Empty states text
     - Loading states

  Return structured inventory:
  - Route → Component → Features list
  - Selectors for interactive elements (CSS or text-based)
  - Expected behaviors per feature
  """
)

# Agent 2 - Backend Discovery
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="""
  AUDIT SCOUT 2/2: Backend Discovery for {$ARGUMENTS}

  Find ALL backend-related files for this audit target:

  1. **Convex Functions**:
     - Queries used by this portal/feature
     - Mutations available
     - Function signatures and arguments
     - Authorization checks

  2. **Database Schema**:
     - Tables relevant to this feature
     - Fields and their types
     - Indexes defined

  3. **Data Flow**:
     - What queries each page calls
     - What mutations each action triggers
     - Expected response shapes

  Return structured inventory:
  - Query/Mutation → Args → Returns → Auth required
  - Table → Fields → Indexes
  - Page → Queries/Mutations mapping
  """
)
```

### 1.2 Collect Scout Results

Results returned directly from foreground Task calls:
- `frontend_scout` = Routes, components, features, selectors
- `backend_scout` = Queries, mutations, schema, data flow

---

## STEP 2: PLAN (Plan Agent)

### 2.1 Launch Plan Agent

```python
Task(
  subagent_type="Plan",
  model="sonnet",
  prompt="""
  AUDIT TEST PLAN DESIGN: {$ARGUMENTS}
  Scope: {userScope}
  Depth: {userDepth}

  ## Scout Results
  Frontend: {frontend_scout}
  Backend: {backend_scout}

  ## Task
  Create a comprehensive browser-based audit test plan.

  ### Test Categories Required:

  **1. Authentication Tests**
  - Login flow for this role
  - Token storage verification (correct localStorage key)
  - Auth guard behavior (redirect if not auth)
  - Logout flow

  **2. Navigation Tests**
  - All tabs/routes accessible
  - Correct content loads per route
  - Sidebar/nav highlights correctly
  - No console errors on navigation

  **3. Feature Tests** (per page discovered)
  For EACH page, create test cases for:
  - Page load (queries fire, data displays)
  - Interactive elements (buttons work)
  - Forms (fields fillable, submit works)
  - CRUD operations (if applicable)
  - Empty states (correct message shown)
  - Error states (graceful handling)

  **4. Data Integrity Tests**
  - Mutations persist correctly (refresh shows change)
  - Queries return expected data shape
  - Real-time updates work (if applicable)

  ### Output Format
  Return test plan as structured markdown:

  ```markdown
  # AUDIT TEST PLAN: {target}

  ## Test Credentials
  - Role: {role}
  - Email: {email from .env.local}
  - Password: {password from .env.local}

  ## Test Suite 1: Authentication
  ### T1.1 - Login Flow
  **Purpose**: Verify user can authenticate
  **Steps**:
  1. navigate http://localhost:5175
  2. snapshot
  3. click "text:Provider Login"
  4. ... (full browser-cli commands)
  **Verify**:
  - URL is /{role}/dashboard
  - Sidebar shows user name
  - No console errors

  ## Test Suite 2: Navigation
  ### T2.1 - Tab Navigation
  ...

  ## Test Suite 3: {Tab/Feature Name}
  ### T3.1 - {Feature Test}
  ...
  ```

  Include EXACT browser-cli commands (navigate, click, type, snapshot, etc.)
  Use selectors from scout results where available.
  Reference NAV-MAP.md patterns for standard selectors.
  """
)
```

### 2.2 Write Pending Audit Plan

```python
# Write to Serena memory as pending audit
mcp__serena__write_memory(
  "PENDING_AUDIT_{$ARGUMENTS}_{timestamp}",
  planAgentOutput
)
```

**Plan Location**: `.serena/memories/PENDING_AUDIT_*.md`

### 2.3 Present Plan Summary

Display to user:

```markdown
## Audit Plan Summary: {$ARGUMENTS}

### Scope
- Role: {role}
- Pages: {N} pages to test
- Features: {M} features identified

### Test Suites
1. **Authentication** - {X} tests
2. **Navigation** - {Y} tests
3. **{Tab 1}** - {Z} tests
4. **{Tab 2}** - {W} tests
...

### Estimated Duration
- Quick: ~2-3 minutes
- Comprehensive: ~5-10 minutes

---
**Plan saved to**: `.serena/memories/PENDING_AUDIT_{name}_{timestamp}.md`
**Next**: Review plan above, then run `/audit-execute` to begin testing.
**Edit**: Modify plan in memory file before executing if needed.
```

---

## EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: CLARIFICATION                                          │
│  └── AskUserQuestion: scope, depth                              │
│      ▼ [User confirms]                                          │
│                                                                 │
│  STEP 1: SCOUT (2 parallel Explore agents - haiku)              │
│  ├── Agent 1: Frontend Discovery                                │
│  └── Agent 2: Backend Discovery                                 │
│      ▼ [GATE: Wait for both]                                    │
│                                                                 │
│  STEP 2: PLAN (1 Plan agent - sonnet)                           │
│  └── Agent 3: Design comprehensive test plan                    │
│      ▼ [Write to memory]                                        │
│                                                                 │
│  OUTPUT: PENDING_AUDIT_*.md ready for /audit-execute            │
└─────────────────────────────────────────────────────────────────┘
```

---

## EXECUTION CHECKLIST

```
□ STEP 0: CLARIFICATION
  □ Scope confirmed (portal/tab/feature/cross-cutting)
  □ Depth confirmed (quick/comprehensive/regression)

□ STEP 1: SCOUT
  □ 2 Explore agents launched (SINGLE message, foreground)
  □ Frontend discovery complete
  □ Backend discovery complete

□ STEP 2: PLAN
  □ Plan agent launched with scout results
  □ Test plan generated with browser-cli commands
  □ Plan written to memory as PENDING_AUDIT_*
  □ Summary presented to user
```

---

## CRITICAL RULES

1. **STEP 0 is mandatory** - Always clarify scope before launching agents
2. **Do NOT run agents in background** - Foreground, wait for completion
3. **Launch parallel agents in SINGLE message** - Multiple `Task` calls
4. **Include exact browser-cli commands** - Not pseudocode
5. **Reference .env.local for credentials** - Don't hardcode
6. **End after presenting plan** - User runs `/audit-execute` next

---

## EXAMPLE USAGE

```bash
# Plan audit for doctor portal
/audit-plan doctor portal

# Plan audit for specific feature
/audit-plan employer bookings

# Plan audit for admin compliance
/audit-plan admin GDPR
```

---

**IMPORTANT**: This command ends after presenting the plan. User reviews, optionally edits the memory file, then runs `/audit-execute` to begin browser testing.
