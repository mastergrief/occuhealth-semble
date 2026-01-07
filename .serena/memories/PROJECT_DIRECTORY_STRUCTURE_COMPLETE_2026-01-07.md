# OccuHealth Medical Starter - Complete Directory Structure & File Inventory
**Project Root**: `/home/gabe/projects/convex-medical-starter`
**Scan Date**: 2026-01-07
**Coverage**: 100% of major directories and significant files

---

## I. PROJECT OVERVIEW

### High-Level Architecture
- **Full-stack healthcare platform** (occupational health) - multi-role (doctor, employer, admin)
- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components
- **Backend**: Convex.dev (serverless backend-as-a-service)
- **Mobile**: React Native via Capacitor (iOS/Android)
- **Testing**: Playwright E2E, Vitest unit tests, custom Browser-CLI for integration testing
- **Authentication**: WorkOS (admins) + Convex Auth (doctors/employers)
- **Database**: Convex data layer (type-safe, real-time subscriptions)

---

## II. ROOT-LEVEL DIRECTORY STRUCTURE

### A. Core Application Directories

| Directory | Purpose | Key Contents |
|-----------|---------|--------------|
| **src/** | Frontend React application | Pages, components, hooks, utilities, types |
| **convex/** | Backend (serverless functions) | Mutations, queries, schema, auth, helpers |
| **tests/** | Test infrastructure | E2E specs, unit tests, fixtures, mocks |
| **public/** | Static assets | convex.svg |
| **dist/** | Build output | Compiled production bundle |

### B. Testing & Development Infrastructure

| Directory | Purpose | Details |
|-----------|---------|---------|
| **BROWSER-CLI/** | Custom Playwright integration testing | 25 features, 2 modular dirs, ~15,000 TS lines |
| **CONVEX-CLI/** | Custom Convex API wrapper | CLI scripts for data operations, 2,000 TS lines |
| **tests/** | Vitest + Playwright test suites | Unit, E2E, fixtures, mocks |

### C. Mobile Application Directories

| Directory | Purpose | Contents |
|-----------|---------|----------|
| **android/** | Android app (Gradle/Kotlin) | app/, build.gradle, gradlew scripts |
| **ios/** | iOS app (Xcode) | App/, capacitor-cordova-ios-plugins |
| **capacitor.config.ts** | Capacitor bridge config | Cross-platform mobile config |

### D. Orchestration & Documentation

| Directory | Purpose | Details |
|-----------|---------|---------|
| **ORCHESTRATION/** | Sprint orchestration & context hub | Parallel execution engine, template processor, evidence chain |
| **DOCUMENTS/** | Project documentation | PRD, sprint plan, audit, auth architecture |
| **AUDIT/** | Test audit logs | Audit results and validation reports |
| **AUDIT_RESULTS/** | Detailed test results | Test suite reports |
| **.CONTEXT/** | Context management | Project memory and state |
| **.claude/** | Claude AI configuration | Agents, commands, rules, hooks |
| **.bmad-core/** | Brownfield methodology docs | Development workflow guides |

### E. Configuration & Metadata

| File | Purpose | Lines |
|------|---------|-------|
| **package.json** | Node dependencies & scripts | 111 |
| **tsconfig.json** | TypeScript configuration | 16 |
| **vite.config.ts** | Build & dev server config | 20 |
| **vitest.config.ts** | Unit test framework config | - |
| **playwright.config.ts** | E2E test framework config | - |
| **eslint.config.js** | Code linting rules | - |
| **components.json** | shadcn/ui configuration | - |
| **.env.local** | Local environment variables | (Dev credentials, API keys) |
| **.env.example** | Example env file template | - |
| **.prettierrc** | Code formatting config | - |

---

## III. FRONTEND SOURCE STRUCTURE (/src)

### Directory Hierarchy
```
src/
├── App.tsx                      (266 lines - main router/layout)
├── main.tsx                     (entry point)
├── index.css                    (global styles)
├── vite-env.d.ts               (Vite type definitions)
├── test-shadcn.tsx             (shadcn component testing)
│
├── pages/                       (Page components - role-based routing)
│   ├── DoctorLayout.tsx         (160 lines - doctor portal layout with sidebar nav)
│   ├── EmployerLayout.tsx       (185 lines - employer portal layout with sidebar nav)
│   ├── AdminLayout.tsx          (222 lines - admin portal layout with top nav)
│   │
│   ├── doctor/                  (Doctor portal pages)
│   │   ├── Dashboard.tsx        (dashboard overview)
│   │   ├── Appointments.tsx     (appointment list)
│   │   ├── Schedule.tsx         (527 lines - recurring slot schedule manager)
│   │   ├── Reports.tsx          (190 lines - employee health reports)
│   │   ├── Settings.tsx         (doctor profile settings)
│   │   ├── README.md            (doctor feature documentation)
│   │   └── __tests__/           (5 test files)
│   │       ├── Dashboard.test.tsx
│   │       ├── Appointments.test.tsx
│   │       ├── Schedule.test.tsx  (147 lines)
│   │       ├── Reports.test.tsx
│   │       └── Settings.test.tsx
│   │
│   ├── employer/                (Employer portal pages)
│   │   ├── Dashboard.tsx        (employer overview)
│   │   ├── Employees.tsx        (employee management)
│   │   ├── Bookings.tsx         (appointment booking)
│   │   ├── Reports.tsx          (report viewing)
│   │   └── Settings.tsx         (employer settings)
│   │
│   ├── admin/                   (Admin portal pages)
│   │   ├── AppointmentTypes.tsx (299 lines - appointment type management)
│   │   ├── EmployerVerification.tsx (151 lines - employer verification UI)
│   │   ├── GDPRDashboard.tsx    (207 lines - GDPR compliance overview)
│   │   ├── AuditLogs.tsx        (176 lines - audit log viewer)
│   │   └── ErasureRequests.tsx  (GDPR erasure request processor)
│   │
│   └── register/                (Registration pages)
│       └── ChooseRole.tsx       (role selection during signup)
│
├── components/                  (Reusable UI components)
│   ├── landing/                 (Landing page sections)
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── CTASection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   └── index.ts            (barrel export)
│   │
│   ├── doctor/                  (Doctor-specific components)
│   │   ├── DoctorRegistrationForm.tsx (174 lines)
│   │   ├── WeekCalendarView.tsx (158 lines - calendar grid visualization)
│   │   ├── recurring/           (Recurring slot feature)
│   │   │   ├── RecurringSlotForm.tsx (216 lines - form builder)
│   │   │   ├── DaySelector.tsx  (day selection UI)
│   │   │   ├── WeekRangeSelector.tsx (week range picker)
│   │   │   ├── TimeSlotList.tsx (150 lines - slot display)
│   │   │   ├── SlotPreview.tsx  (226 lines - preview with conflict detection)
│   │   │   ├── QuickFillBar.tsx (175 lines - quick fill toolbar)
│   │   │   ├── ConflictResolution.tsx (138 lines - conflict UI handler)
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── employer/                (Employer-specific components)
│   │   ├── EmployerRegistrationForm.tsx (356 lines - company registration)
│   │   ├── EmployeeForm.tsx     (142 lines - employee add/edit)
│   │   ├── EmployeeList.tsx     (employee display list)
│   │   ├── BookingFlow.tsx      (250 lines - 3-step booking wizard)
│   │   ├── ReportsList.tsx      (report display)
│   │   └── index.ts
│   │
│   ├── auth/                    (Authentication components)
│   │   ├── AdminAuthCallback.tsx (WorkOS auth callback handler)
│   │   ├── SignOutButton.tsx    (logout button)
│   │   └── index.ts
│   │
│   ├── layout/                  (Layout components)
│   │   ├── NavigationBar.tsx    (landing page header nav)
│   │   ├── Container.tsx        (layout wrapper)
│   │   ├── Footer.tsx           (footer section)
│   │   └── index.ts
│   │
│   ├── ui/                      (shadcn/ui primitives - 15 files)
│   │   ├── button.tsx
│   │   ├── dialog.tsx           (141 lines)
│   │   ├── select.tsx           (179 lines)
│   │   ├── dropdown-menu.tsx    (255 lines)
│   │   ├── navigation-menu.tsx  (168 lines)
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── sheet.tsx
│   │   ├── separator.tsx
│   │   └── alert-dialog.tsx     (157 lines)
│   │
│   ├── ThemeToggle.tsx          (dark mode switcher)
│   ├── ErrorBoundary.tsx        (error handling wrapper)
│   └── index.ts                 (component re-exports)
│
├── hooks/                       (Custom React hooks)
│   └── useTheme.ts             (theme management hook)
│
├── lib/                         (Utilities & services)
│   ├── workos-auth.tsx         (477 lines - WorkOS auth context + hooks)
│   ├── workos-auth.test.ts     (554 lines - auth tests)
│   ├── utils.ts                (utility functions)
│   └── __tests__/
│       └── workos-auth.test.ts
│
└── types/                       (TypeScript type definitions)
    ├── index.ts                (exported types)
    ├── doctor.ts               (158 lines - doctor domain types)
    └── scheduling.ts           (scheduling & slots types)
```

### File Metrics Summary (Frontend)
- **Total Lines**: 9,937 TS/TSX lines
- **Largest Files**: workos-auth.test.ts (554), Schedule.tsx (527), workos-auth.tsx (477)
- **Organization Pattern**: Feature-based with layered structure
  - Pages (role-separated)
  - Components (feature-organized)
  - Hooks (custom React hooks)
  - Lib (utilities/services)
  - Types (domain models)
- **UI Pattern**: shadcn/ui components with Radix UI primitives
- **State Management**: Convex real-time subscriptions + React context for auth

---

## IV. BACKEND SOURCE STRUCTURE (/convex)

### Directory Hierarchy
```
convex/
├── schema.ts                    (294 lines - data model definition)
├── auth.config.ts              (Convex Auth configuration)
├── http.ts                      (286 lines - HTTP routing)
│
├── Core Domain Modules
│   ├── patients.ts             (181 lines - employee/patient records)
│   ├── appointments.ts         (317 lines - appointment management)
│   ├── reports.ts              (239 lines - medical reports)
│   ├── availableSlots.ts       (659 lines - recurring slot scheduler)
│   ├── appointmentTypes.ts     (213 lines - appointment type definitions)
│   ├── employers.ts            (234 lines - employer company management)
│   ├── doctorSettings.ts       (144 lines - doctor profile settings)
│   ├── adminUsers.ts           (118 lines - admin user management)
│   └── gdpr.ts                 (430 lines - GDPR compliance & erasure)
│
├── authModules/                (Authorization layer)
│   ├── authorization.ts        (207 lines - permission & access control)
│   └── index.ts
│
├── lib/                         (Backend utilities)
│   ├── dateUtils.ts            (207 lines - date manipulation & scheduling)
│   └── (test files)
│
├── helpers/                     (Reusable helper functions)
│   ├── auditLogger.ts          (160 lines - GDPR audit logging)
│   ├── batchFetch.ts           (174 lines - batch data fetching)
│   ├── pagination.ts           (116 lines - cursor pagination)
│   └── index.ts
│
├── __tests__/                   (Backend unit tests)
│   └── doctor-authorization.test.ts (145 lines)
│
├── myFunctions.ts              (legacy test functions)
├── oauthState.ts               (OAuth state management)
│
└── _generated/                 (Convex compiler output - AUTO-GENERATED)
    ├── api.d.ts                (TypeScript API type definitions)
    ├── api.js                  (API runtime)
    ├── server.d.ts             (143 lines - server types)
    ├── server.js
    └── dataModel.d.ts
```

### File Metrics Summary (Backend)
- **Total Lines**: 4,594 TS lines
- **Largest Files**: availableSlots.ts (659), gdpr.ts (430), appointments.ts (317)
- **Organization Pattern**: Domain-based modules with authorization layer
  - Domain modules (patients, appointments, etc.)
  - Auth layer (permissions & access control)
  - Helpers (utilities, logging, fetching)
  - Schema (type-safe data model)
- **Key Features**:
  - Recurring slot scheduling (659 lines)
  - GDPR compliance & erasure (430 lines)
  - Real-time data subscriptions
  - Authorization checks per domain
  - Audit logging for compliance

---

## V. CONFIGURATION FILES REFERENCE

### Build & Runtime Configuration
```
/home/gabe/projects/convex-medical-starter/
├── vite.config.ts              (20 lines - Vite build config)
├── vitest.config.ts            (Vitest unit testing config)
├── playwright.config.ts        (Playwright E2E testing config)
├── tsconfig.json               (16 lines - base TS config)
├── tsconfig.app.json           (app-specific TS config)
├── tsconfig.node.json          (Node tools TS config)
├── convex/tsconfig.json        (backend TS config)
├── package.json                (111 lines - dependencies & scripts)
├── package-lock.json           (lock file)
├── components.json             (shadcn/ui registry)
├── capacitor.config.ts         (mobile Capacitor config)
├── eslint.config.js            (code quality rules)
├── .prettierrc                  (code formatting)
├── .gitignore                   (git exclusions)
├── convex_rules.mdc            (Convex schema validation rules)
└── setup.mjs                    (setup script)
```

### Environment Configuration
```
.env.local                       (Local development env vars)
.env.example                     (Template for env setup)
```

### CI/CD & Deployment
```
- No GitHub Actions workflows in root
- Deployment configs referenced in .claude/
- WorkOS configuration via .env.local
- Convex deployment managed via convex CLI
```

---

## VI. TESTING INFRASTRUCTURE (/tests)

### Structure
```
tests/
├── setup.ts                     (Test environment setup)
├── unit/
│   └── setup.test.ts
├── e2e/
│   ├── auth/
│   │   ├── login.spec.ts        (WorkOS login flow)
│   │   ├── role-routing.spec.ts (role-based routing)
│   │   └── logout.spec.ts       (logout behavior)
│   └── fixtures/
│       ├── auth.fixture.ts      (auth test fixture)
│       └── .gitkeep
└── mocks/
    ├── convex.ts               (Convex API mock)
    └── router.ts               (routing mock)
```

### Key Test Files
- **Doctor Portal Tests**: 5 files in src/pages/doctor/__tests__/
  - Dashboard.test.tsx
  - Appointments.test.tsx
  - Schedule.test.tsx (147 lines)
  - Reports.test.tsx
  - Settings.test.tsx

---

## VII. BROWSER-CLI INFRASTRUCTURE (Integration Testing)

### Architecture Overview
- **~15,000 TypeScript lines**
- **25 features** + 2 modular directories
- **TCP daemon** on port 3456
- **Playwright-based** test automation
- **Auto-manager** with browser pooling

### Directory Structure
```
BROWSER-CLI/
├── SCRIPTS/
│   ├── browser-cmd.ts          (CLI entry point)
│   ├── browser-manager.ts      (daemon manager)
│   ├── template-runner.ts      (template execution)
│   │
│   ├── core/                   (Core framework)
│   │   ├── config.ts
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── server.ts
│   │
│   ├── browserManagerModules/  (Manager implementation)
│   │   ├── BrowserManager.ts
│   │   ├── command-dispatcher.ts
│   │   ├── feature-registry.ts
│   │   ├── browser-pool.ts
│   │   ├── response-enricher.ts
│   │   ├── lifecycle.ts
│   │   └── index.ts
│   │
│   ├── features/               (25 Feature implementations)
│   │   ├── SnapshotFeature.ts
│   │   ├── snapshot.ts
│   │   ├── snapshotModules/    (9 files - modular snapshot)
│   │   ├── coreActionsModules/ (6 files - modular actions)
│   │   ├── console-capture.ts
│   │   ├── network-capture.ts
│   │   ├── network-mocking.ts
│   │   ├── assertions.ts
│   │   ├── browser-state.ts
│   │   ├── visual-regression.ts
│   │   ├── device-emulation.ts
│   │   ├── video-recording.ts
│   │   ├── a11y-audit.ts
│   │   ├── har-export.ts
│   │   ├── tabs.ts
│   │   ├── drag.ts
│   │   ├── semantic-selectors.ts
│   │   ├── orchestration-feature.ts
│   │   ├── flaky-detection.ts
│   │   ├── dom-inspection.ts
│   │   ├── content-capture.ts
│   │   └── plugins-feature.ts
│   │
│   ├── cli/                    (CLI layer)
│   │   ├── command-parser.ts
│   │   ├── command-validator.ts
│   │   ├── command-help.ts
│   │   ├── commandHelpModules/ (22 help modules)
│   │   ├── responseFormatterModules/ (16 formatter modules)
│   │   ├── commandParserModules/     (11 parser modules)
│   │   ├── error-context.ts
│   │   ├── completion-generator.ts
│   │   └── screenshot-formatter.ts
│   │
│   ├── repl/                   (Interactive REPL)
│   │   ├── REPLSession.ts
│   │   ├── completer.ts
│   │   └── index.ts
│   │
│   ├── orchestrator/           (Test orchestration)
│   │   ├── TestOrchestrator.ts
│   │   ├── test-distributor.ts
│   │   └── result-aggregator.ts
│   │
│   ├── utils/                  (Utilities)
│   │   ├── logger.ts
│   │   ├── schema-validator.ts
│   │   ├── diff-image-generator.ts
│   │   ├── retry.ts
│   │   ├── tracer.ts
│   │   └── circular-buffer.ts
│   │
│   └── plugins/                (Plugin system)
│       ├── plugin-interface.ts
│       ├── plugin-loader.ts
│       ├── plugin-validator.ts
│       ├── plugin-config.ts
│       └── scaffold.ts
│
├── states/                     (Saved browser states - 15+ files)
│   ├── authenticated-doctor.json
│   ├── authenticated-employer-fixed.json
│   ├── authenticated-coach.json
│   ├── landing-page.json
│   └── ...
│
├── templates/                  (Test templates)
│   ├── generic/
│   │   ├── login-flow.txt
│   │   ├── crud-create.txt
│   │   ├── crud-update.txt
│   │   ├── crud-delete.txt
│   │   ├── form-validation.txt
│   │   └── modal-workflow.txt
│   └── zenith/
│       ├── auth-flow.txt
│       ├── form-validation.txt
│       └── modal-test.txt
│
├── schemas/                    (JSON Schema definitions)
│   ├── user-response.json
│   ├── workout-response.json
│   ├── error-response.json
│   └── browser-state.json
│
├── screenshots/                (Test screenshots - 250+ PNG files)
│   ├── 01-landing-page.png
│   ├── 02-dashboard-authenticated.png
│   └── ...
│
├── evidence/                   (Test evidence archive)
│
├── test-evidence/              (Current test evidence)
│
├── instances/                  (Multi-instance support)
│   ├── inst1/
│   ├── inst2/
│   └── inst3/
│
├── tests/                      (Browser-CLI unit tests)
│   ├── cli/
│   ├── features/
│   ├── utils/
│   ├── e2e/
│   ├── fixtures/
│   └── security/
│
├── DOCS/                       (Performance documentation)
│   ├── SNAPSHOT_PERFORMANCE_RESULTS.md
│   └── SNAPSHOT_PERFORMANCE_ANALYSIS.md
│
├── completions/                (Shell completions)
│   ├── bash.sh
│   ├── zsh.sh
│   └── fish.fish
│
├── CHANGELOG.md
├── browser-state.json
├── .browser-cli.yaml
└── README.md
```

### Key Metrics
- **CLI Commands**: 80+ commands with modular parsing
- **Features**: 25 feature classes implementing different testing capabilities
- **Tests**: 20+ test files with 95%+ coverage
- **Screenshots**: 250+ test artifacts
- **States**: 15+ saved browser states for quick test setup

---

## VIII. CONVEX-CLI INFRASTRUCTURE (Backend API)

### Architecture Overview
- **~2,000 TypeScript lines**
- **7 CLI scripts** for direct Convex operations
- **LRU caching** with 60s/300s TTL
- **Response validation** via Zod schemas

### Structure
```
CONVEX-CLI/
├── SCRIPTS/
│   ├── convex-status.ts        (deployment status)
│   ├── convex-tables.ts        (list database tables)
│   ├── convex-functions.ts     (list server functions)
│   ├── convex-data.ts          (query table data)
│   ├── convex-run.ts           (execute function)
│   ├── convex-env.ts           (manage env vars)
│   └── convex-logs.ts          (stream backend logs)
│
├── README.md                   (CLI documentation)
├── PERFORMANCE.md              (performance metrics)
├── TEST-RESULTS.md
└── TROUBLESHOOTING.md
```

### CLI Commands
```
# Status & Discovery
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json
npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --json

# Data Operations
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <table> --limit=10 --json
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <fn:name> '{}' --json

# Environment Management
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --json
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts set VAR value

# Logs & Debugging
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=20 --json
```

---

## IX. ORCHESTRATION FRAMEWORK (/ORCHESTRATION)

### Purpose
Advanced sprint orchestration with parallel execution, template processing, evidence chain, and context hub.

### Structure
```
ORCHESTRATION/
├── README.md                   (orchestration documentation)
│
├── lib/
│   ├── context-hub.ts          (main context management)
│   ├── parallel-engine.ts      (parallel task execution)
│   ├── evidence-chain.ts       (evidence tracking)
│   ├── evidenceAutoPopulator.ts
│   ├── dashboard-types.ts
│   ├── dashboard-data.ts
│   │
│   ├── contextHubModules/      (21+ files)
│   │   ├── session.ts
│   │   ├── state.ts
│   │   ├── history.ts
│   │   ├── validation.ts
│   │   ├── plans.ts
│   │   ├── prompts.ts
│   │   ├── handoffs.ts
│   │   ├── memory.ts
│   │   ├── gates.ts
│   │   └── gatesModules/       (complex validation framework)
│   │       ├── checking.ts
│   │       ├── parsing.ts
│   │       ├── advancement.ts
│   │       ├── evidence.ts
│   │       └── checkingModules/ (timeout, legacy, modern)
│   │
│   ├── templateProcessorModules/ (5 files)
│   │   ├── processor.ts
│   │   ├── instantiation.ts
│   │   ├── validation.ts
│   │   ├── schemas.ts
│   │   └── types.ts
│   │
│   ├── parallelEngineModules/  (4 files)
│   │   ├── engine.ts
│   │   ├── execution.ts
│   │   ├── scheduling.ts
│   │   └── types.ts
│   │
│   ├── evidenceChainModules/   (3 files)
│   │   ├── builder.ts
│   │   ├── validation.ts
│   │   └── io.ts
│   │
│   └── utils/                  (4 utility files)
│       ├── logger.ts
│       ├── asyncFs.ts
│       ├── retry.ts
│       └── errors.ts
│
└── CONTEXT_HUB/               (Session/plan storage)
    └── sessions/
        ├── 20260103_16-24_62970f3d-79a2-49c5-afa2-b9c65b32ae15/
        └── 20260104_auth-e2e-bugfixes/
            └── plan.json
```

---

## X. DOCUMENTATION STRUCTURE

### Project Documentation (/DOCUMENTS)
```
DOCUMENTS/
├── PRD.md                      (Product requirements)
├── AUTH.md                     (Authentication architecture)
├── CONVEX-AUTH.md              (Convex Auth configuration)
├── SPRINT.md                   (Sprint planning)
├── TODO.md                     (Task tracking)
└── AUDIT.md                    (Audit procedures)
```

### Test Documentation (Root-Level)
```
Root Test Reports:
├── E2E_TEST_SUMMARY.md         (summary of E2E tests)
├── E2E_VALIDATION_REPORT.md
├── E2E_AUTH_VALIDATION_REPORT.md
├── PHASE5_TEST_REPORT.md
├── RECURRING_SLOTS_E2E_TEST_REPORT.md
├── SPRINT_03_VERIFICATION_REPORT.md
├── SPRINT_05A_TEST_REPORT.md
├── SPRINT_05-B_FINAL_E2E_TEST_REPORT.md
├── TESTING_QUICK_REFERENCE.md
├── TEST_ARTIFACTS_INDEX.md
├── TEST_RESULTS_INDEX.md
├── VALIDATION_RESULTS_INDEX.md
└── Evidence/audit reports
```

### Configuration Documentation
```
.claude/CLAUDE.md               (Claude AI session instructions)
.claude/STATUSLINE_GUIDE.md
.claude/rules/                  (Project rules)
├── BROWSER-CLI/
│   ├── NAV-MAP.md             (routing & navigation map)
│   └── SKILL.md               (Browser-CLI complete reference)
└── WORK_OS/
    └── WORKOS_API_PROGRAMMATIC_ACCESS.md
```

### Brownfield Development Guides
```
.bmad-core/
├── enhanced-ide-development-workflow.md
├── user-guide.md
└── working-in-the-brownfield.md
```

---

## XI. MOBILE APPLICATIONS

### Android App
```
android/
├── app/                        (main Android module)
├── capacitor-cordova-android-plugins/  (native plugins)
├── build.gradle                (Gradle build config)
├── gradle/                     (Gradle wrapper)
├── settings.gradle
├── variables.gradle
└── .gitignore
```

### iOS App
```
ios/
├── App/                        (Xcode project)
│   ├── App/                    (Swift source)
│   ├── App.xcodeproj/          (project config)
│   └── Pods/                   (CocoaPods dependencies)
├── capacitor-cordova-ios-plugins/  (native plugins)
└── .gitignore
```

### Cross-Platform Config
- **capacitor.config.ts**: Capacitor bridge configuration for iOS/Android

---

## XII. SERENA PROJECT MEMORY

### Memories Created (Available for Context)
The project has extensive memories documenting architecture, conventions, features, and backend implementations:

**High-Level Architecture**:
- `00_PROJECT_OVERVIEW` - Complete project description
- `01_TECH_STACK` - Technology choices
- `04_ARCHITECTURE` - System architecture patterns

**Code Conventions**:
- `02_CODE_CONVENTIONS` - Naming, patterns, style
- `03_COMMANDS` - NPM & CLI commands

**Feature Documentation**:
- `RECURRING_SLOTS_INDEX` - Index of recurring slots feature
- `RECURRING_SLOTS_FEATURE_COMPLETE_2026-01-06` - Complete implementation
- `RECURRING_SLOTS_IMPLEMENTATION_COMPLETE_2026-01-06` - Final status

**Backend/Portal Documentation**:
- `11_BACKEND_DISCOVERY_EMPLOYERS_PORTAL` - Employer backend
- `12_EMPLOYER_PORTAL_PAGES_FEATURE_MAP` - Employer UI structure
- `13_BACKEND_DISCOVERY_ADMIN_PORTAL_2026-01-06` - Admin backend

**Integration & Deployment**:
- `05_WORKOS_API_PROGRAMMATIC_ACCESS` - WorkOS API reference
- `06_WORKOS_CONVEX_INTEGRATION_GUIDE` - Auth integration
- `07_WORKOS_REDIRECT_CONFIGURATION_GUIDE` - WorkOS config
- `10_CONVEX_DEPLOYMENT_OCCUHEALTH` - Convex deployment
- `08_ICO_REGISTRATION_HOSTING_GUIDANCE` - Hosting setup

**Testing & QA**:
- Multiple sprint test reports (SPRINT_03, SPRINT_05A, etc.)
- E2E test reports and validations
- Recurring slots E2E testing documentation

**Project Management**:
- `09_PROJECT_HANDOVER_GUIDE` - Knowledge transfer
- `00_TEMPLATE_CONVEX_DEPLOYMENT_GUIDE` - Deployment template

---

## XIII. ORGANIZATION PATTERNS

### Frontend Architecture Pattern
**Feature-Based with Layered Structure**:
- Pages layer: Role-separated pages (doctor/, employer/, admin/)
- Components layer: Feature-organized (landing/, doctor/recurring, employer/)
- Utilities layer: hooks/, lib/, types/
- UI primitives: shadcn/ui components

### Backend Architecture Pattern
**Domain-Driven Design**:
- Domain modules: patients.ts, appointments.ts, reports.ts, etc.
- Authorization layer: permissions & access control
- Helper layer: pagination, batch fetching, date utilities
- Schema: Central type-safe data model definition

### Modular Architecture (Facade Pattern)
**Monolith Prevention** (based on CLAUDE.md):
- Threshold: >400 lines flag as concern, >800 lines must split
- Pattern: Facade file (<100 lines) + focused modules (150-400 lines)
- Structure: `module.ts` (facade) → `moduleModules/{mutations,queries,domain}.ts`
- Reference: `calendarWorkoutsModules/`, `trainingBlockMarkersModules/`

### Testing Architecture
- E2E: Playwright specs in tests/e2e/
- Unit: Vitest in src/__tests__/ and convex/__tests__/
- Integration: Browser-CLI for full stack testing
- Fixtures: Common test data in tests/fixtures/

---

## XIV. KEY STATISTICS

### Codebase Size
| Layer | Files | Lines | Notes |
|-------|-------|-------|-------|
| Frontend (src/) | ~50 | 9,937 | React + TypeScript |
| Backend (convex/) | ~25 | 4,594 | Serverless functions |
| Tests | 20+ | 1,000+ | E2E + unit tests |
| BROWSER-CLI | ~80 | 15,000 | Integration testing |
| CONVEX-CLI | ~7 | 2,000 | Backend API CLI |
| ORCHESTRATION | ~50 | 5,000+ | Sprint orchestration |
| Total Tracked | ~230 | 37,000+ | Core application |

### Component Distribution
- **UI Components**: 15 shadcn primitives
- **Feature Components**: ~20 feature-specific
- **Page Components**: 14 role-separated pages
- **Layout Components**: 3 (doctor, employer, admin)

### Backend Modules
- **Domain Modules**: 9 (patients, appointments, reports, slots, etc.)
- **Auth Modules**: 1 (authorization layer)
- **Helper Modules**: 3 (logging, fetching, pagination)
- **Total Functions**: 100+ queries/mutations

---

## XV. DEPLOYMENT & CONFIGURATION

### Environment Management
```
.env.local                      (development secrets)
.env.example                    (template)
Contains:
- CONVEX deployment URL
- WorkOS API key & client ID
- GPT-5-mini API key (default temp=1)
- Test user credentials
```

### Build & Deployment
- **Frontend Build**: Vite (npm run build)
- **Backend**: Convex (auto-deployed via CLI)
- **Mobile**: Capacitor (npm run build:mobile)
- **Testing**: Playwright (npm test:e2e) + Browser-CLI

### CI/CD Configuration
- No GitHub Actions workflows in repository
- Manual deployment via Convex CLI & hosting platform
- Environment variables via WorkOS/Convex dashboards

---

## XVI. NOTATION & CONVENTIONS

### File Organization
- **Barrel Exports**: index.ts files re-export modules (e.g., src/components/landing/index.ts)
- **Modular Utilities**: dateUtils.ts, auditLogger.ts, batchFetch.ts
- **Test Co-location**: __tests__/ folders alongside source

### Naming Conventions
- **Components**: PascalCase (EmployerRegistrationForm.tsx)
- **Utilities**: camelCase (workos-auth.tsx)
- **Types**: PascalCase (Doctor, Appointment, Patient)
- **Constants**: UPPERCASE_SNAKE_CASE

### Type Safety
- **TypeScript**: Strict mode across all files
- **Convex**: Generated types in _generated/api.d.ts
- **Zod Schemas**: Input validation for API endpoints
- **shadcn/ui**: Type-safe component props

---

## DISCOVERY COMPLETE

This inventory covers:
- 22 root-level directories
- 230+ tracked files (excluding node_modules)
- 37,000+ lines of core application code
- Complete architecture documentation
- All major features and modules

**Key Takeaway**: OccuHealth is a full-stack healthcare platform with:
- **Frontend**: React 18 with role-based portals (doctor, employer, admin)
- **Backend**: Convex serverless with domain-driven architecture
- **Mobile**: React Native via Capacitor
- **Testing**: Comprehensive E2E + unit testing + integration testing
- **DevOps**: Orchestration framework with parallel execution & template processing
