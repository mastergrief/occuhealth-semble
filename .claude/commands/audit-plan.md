# AUDIT-PLAN - Discovery & Test Design Phase

**Purpose**: Phase 0-2 of audit - discover codebase context and design test plan
**Output**: Pending plan in `AUDIT/context-hub/pending-plans/` for `/audit-execute` to consume
**Mode**: Any
**Arguments**: `$ARGUMENTS` = Target area to audit (e.g., "user dashboard", "checkout flow", "admin panel")
**Agents**: 2-3 Explore (haiku, parallel) → 1 Plan (opus)

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
        {"label": "Full application", "description": "All authenticated areas and features"},
        {"label": "Specific area", "description": "Single section, page, or feature"},
        {"label": "User flow", "description": "End-to-end journey (login → action → logout)"},
        {"label": "Component", "description": "Single UI component deep dive"}
      ],
      "multiSelect": False
    },
    {
      "question": "What testing approach?",
      "header": "Approach",
      "options": [
        {"label": "Smoke test (Recommended)", "description": "Pages load, no errors, basic flow works"},
        {"label": "Functional", "description": "All features work as expected"},
        {"label": "Regression", "description": "Compare to known baseline"},
        {"label": "Exploratory", "description": "Find unknown issues"}
      ],
      "multiSelect": False
    },
    {
      "question": "Use a template?",
      "header": "Template",
      "options": [
        {"label": "web-app", "description": "Standard SPA with auth and CRUD"},
        {"label": "dashboard", "description": "Data visualization and filtering"},
        {"label": "api-only", "description": "Backend API testing (no browser)"},
        {"label": "accessibility", "description": "WCAG 2.1 AA compliance"},
        {"label": "mobile-responsive", "description": "Viewport and touch testing"},
        {"label": "No template", "description": "Generate from scratch"}
      ],
      "multiSelect": False
    }
  ]
)
```

**Do NOT proceed until scope is confirmed!**

---

## STEP 1: SCOUT (2-3 Explore Agents - Parallel)

### 1.1 Launch Explore Agents (SINGLE message, foreground)

```python
# Agent 1 - Frontend Discovery
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="""
  AUDIT SCOUT 1/3: Frontend Discovery for {$ARGUMENTS}

  Find ALL UI-related files for this audit target:

  1. **Routes & Navigation**:
     - Discover all route definitions (React Router, Next.js, Vue Router, etc.)
     - Identify navigation components (sidebars, headers, tabs, breadcrumbs)
     - Map route → component relationships
     - Find layout wrapper components

  2. **Authentication Pattern**:
     - Identify auth provider (Clerk, Auth0, WorkOS, Firebase, Supabase, custom)
     - Find auth context/hooks (useAuth, useSession, etc.)
     - Locate token storage mechanism (localStorage, cookies, memory)
     - Document guard/protection patterns (PrivateRoute, withAuth, middleware)
     - Find login/logout components

  3. **Page Components**:
     - List all page-level components with line counts
     - Document what each page does
     - Identify shared components

  4. **Feature Inventory** (per page):
     - Interactive elements (buttons, forms, modals, dropdowns)
     - Data displays (tables, lists, cards, charts)
     - State indicators (loading, empty, error)
     - Form validation patterns

  5. **Testable Selectors**:
     - data-testid attributes if present
     - Semantic selectors (role, aria-label)
     - Text-based selectors for buttons/links
     - CSS selectors as fallback

  Return structured inventory with selectors for testing.
  """
)

# Agent 2 - Backend Discovery
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="""
  AUDIT SCOUT 2/3: Backend Discovery for {$ARGUMENTS}

  Find ALL backend-related files for this audit target:

  1. **API Layer**:
     - Identify API pattern (REST, GraphQL, tRPC, Convex, Firebase)
     - List all endpoints/functions relevant to target
     - Document request/response shapes
     - Find API client configuration

  2. **Database/State**:
     - Identify data store (SQL, NoSQL, Convex, Firebase, Supabase)
     - List tables/collections relevant to target
     - Document field types and relationships
     - Find indexes and constraints

  3. **Data Flow**:
     - Map which queries each page calls
     - Map which mutations each action triggers
     - Document expected response shapes
     - Identify real-time subscription patterns

  4. **Authorization**:
     - Document role-based access controls
     - Find permission checks in API layer
     - Identify protected resources

  Return structured inventory:
  - Query/Mutation → Args → Returns → Auth required
  - Table → Fields → Indexes
  - Page → Queries/Mutations mapping
  """
)

# Agent 3 - Credential Discovery (Optional - if auth required)
Task(
  subagent_type="Explore",
  model="haiku",
  prompt="""
  AUDIT SCOUT 3/3: Credential Discovery for {$ARGUMENTS}

  Find test credentials for this codebase:

  1. **Environment Files**:
     - Check .env.local, .env.test, .env.development
     - Look for TEST_USER, TEST_EMAIL, TEST_PASSWORD patterns
     - Find any auth-related environment variables

  2. **Fixture Files**:
     - Search cypress/fixtures/
     - Search tests/fixtures/, __tests__/
     - Find seed scripts or test data files

  3. **Documentation**:
     - Check README.md for test credentials
     - Look in docs/ folder for testing guides
     - Find any onboarding documentation

  4. **Auth Method**:
     - Identify auth method (email/password, OAuth, API keys, magic links)
     - Document credential format required
     - Note any MFA or additional steps

  Return:
  {
    "auth_method": "email_password | oauth | api_key | magic_link",
    "credentials_location": "path/to/file or env var names",
    "test_users": [
      { "role": "admin", "email": "...", "password_env": "..." }
    ],
    "notes": "any special instructions"
  }
  """
)
```

### 1.2 Collect Scout Results

Results returned directly from foreground Task calls:
- `frontend_scout` = Routes, components, features, selectors
- `backend_scout` = Queries, mutations, schema, data flow
- `credentials_scout` = Test credentials and auth method

---

## STEP 2: PLAN (Plan Agent)

### 2.1 Load Template (if selected)

```bash
# If user selected a template
npx tsx AUDIT/cli/audit.ts template show {templateId} --json
```

### 2.2 Launch Plan Agent

```python
Task(
  subagent_type="Plan",
  model="opus",
  prompt="""
  AUDIT TEST PLAN DESIGN: {$ARGUMENTS}
  Scope: {userScope}
  Approach: {userApproach}
  Template: {templateId or "none"}

  ## Scout Results
  Frontend: {frontend_scout}
  Backend: {backend_scout}
  Credentials: {credentials_scout}

  ## Template (if applicable)
  {template_content}

  ## Task
  Create a comprehensive browser-based audit test plan.

  ### Adapt Categories to This Codebase

  Based on scout results, create test categories that match what exists:

  - **If auth discovered**: Create Authentication test suite
  - **If routes discovered**: Create Navigation test suite
  - **Per page discovered**: Create page-specific test suite
  - **If forms discovered**: Create Form/CRUD test suite
  - **If real-time discovered**: Create Real-time test suite

  ### Output Format
  Return test plan as JSON for CLI consumption:

  ```json
  {
    "target": "{$ARGUMENTS}",
    "scope": "{userScope}",
    "approach": "{userApproach}",
    "template": "{templateId}",
    "generatedAt": "ISO timestamp",
    "credentials": {
      "method": "email_password",
      "users": [{ "role": "...", "email": "...", "passwordEnv": "..." }]
    },
    "baseUrl": "http://localhost:PORT",
    "suites": [
      {
        "id": "auth",
        "name": "Authentication",
        "tests": [
          {
            "id": "AUTH-01",
            "name": "Login Flow",
            "purpose": "Verify user can authenticate",
            "steps": [
              "navigate {baseUrl}",
              "snapshot",
              "click 'text:Login'",
              "type 'input[type=email]' '{email}'",
              "type 'input[type=password]' '{password}'",
              "click 'text:Sign In'",
              "wait 2000",
              "snapshot"
            ],
            "verify": [
              "URL contains /dashboard or authenticated area",
              "User info displayed",
              "No console errors"
            ],
            "selectors": {
              "loginButton": "text:Login",
              "emailInput": "input[type=email]",
              "submitButton": "text:Sign In"
            }
          }
        ]
      },
      {
        "id": "nav",
        "name": "Navigation",
        "tests": [...]
      }
    ]
  }
  ```

  Include EXACT browser-cli commands (navigate, click, type, snapshot, etc.)
  Use selectors from scout results where available.
  Adapt test steps to match the codebase's actual patterns.
  """
)
```

### 2.3 Write Pending Audit Plan

```bash
# Write plan to AUDIT CLI pending plans
npx tsx AUDIT/cli/audit.ts plan write-pending "{planAgentOutput}"
```

**Plan Location**: `AUDIT/context-hub/pending-plans/plan-<timestamp>.json`

### 2.4 Present Plan Summary

Display to user:

```markdown
## Audit Plan Summary: {$ARGUMENTS}

### Scope
- Target: {target_area}
- Approach: {approach}
- Template: {template or "custom"}

### Test Suites
| Suite | Tests | Coverage |
|-------|-------|----------|
| Authentication | {N} | Login, Logout, Guards |
| Navigation | {M} | {routes discovered} |
| {Page 1} | {X} | {features} |
| {Page 2} | {Y} | {features} |

### Credentials
- Method: {auth_method}
- Test Users: {N} roles configured
- Location: {credentials_location}

### Estimated Tests
- Total: {total_tests}
- Smoke: ~2-3 minutes
- Comprehensive: ~5-10 minutes

---
**Plan saved to**: `AUDIT/context-hub/pending-plans/plan-{timestamp}.json`
**Next**: Review plan above, then run `/audit-execute` to begin testing.
**Edit**: Modify plan file before executing if needed.
```

---

## EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: CLARIFICATION                                          │
│  └── AskUserQuestion: scope, approach, template                 │
│      ▼ [User confirms]                                          │
│                                                                 │
│  STEP 1: SCOUT (2-3 parallel Explore agents - haiku)            │
│  ├── Agent 1: Frontend Discovery                                │
│  ├── Agent 2: Backend Discovery                                 │
│  └── Agent 3: Credential Discovery (if auth)                    │
│      ▼ [GATE: Wait for all]                                     │
│                                                                 │
│  STEP 2: PLAN (1 Plan agent - opus)                             │
│  ├── Load template (if selected)                                │
│  └── Design comprehensive test plan                             │
│      ▼ [Write to AUDIT CLI]                                     │
│                                                                 │
│  OUTPUT: pending-plans/plan-*.json ready for /audit-execute     │
└─────────────────────────────────────────────────────────────────┘
```

---

## EXECUTION CHECKLIST

```
□ STEP 0: CLARIFICATION
  □ Scope confirmed (full app/specific area/flow/component)
  □ Approach confirmed (smoke/functional/regression/exploratory)
  □ Template selected (or custom)

□ STEP 1: SCOUT
  □ 2-3 Explore agents launched (SINGLE message, foreground)
  □ Frontend discovery complete
  □ Backend discovery complete
  □ Credential discovery complete (if auth required)

□ STEP 2: PLAN
  □ Template loaded (if selected)
  □ Plan agent launched with scout results
  □ Test plan generated as JSON
  □ Plan written to AUDIT/context-hub/pending-plans/
  □ Summary presented to user
```

---

## CLI REFERENCE

```bash
# List pending plans
npx tsx AUDIT/cli/audit.ts plan list-pending

# Load a pending plan
npx tsx AUDIT/cli/audit.ts plan load-pending [name]

# List available templates
npx tsx AUDIT/cli/audit.ts template list

# Show template details
npx tsx AUDIT/cli/audit.ts template show web-app --json
```

---

## CRITICAL RULES

1. **STEP 0 is mandatory** - Always clarify scope before launching agents
2. **Do NOT run agents in background** - Foreground, wait for completion
3. **Launch parallel agents in SINGLE message** - Multiple `Task` calls
4. **Adapt to codebase** - Scout results drive test design, not assumptions
5. **Discover credentials** - Don't assume credential locations or formats
6. **Use JSON output** - For CLI consumption and `/audit-execute` parsing
7. **End after presenting plan** - User runs `/audit-execute` next

---

## EXAMPLE USAGE

```bash
# Plan audit for user dashboard
/audit-plan user dashboard

# Plan audit for checkout flow
/audit-plan checkout flow --template=web-app

# Plan audit for API endpoints
/audit-plan API endpoints --template=api-only

# Plan accessibility audit
/audit-plan main pages --template=accessibility
```

---

**IMPORTANT**: This command ends after presenting the plan. User reviews, optionally edits the pending plan file, then runs `/audit-execute` to begin browser testing.
