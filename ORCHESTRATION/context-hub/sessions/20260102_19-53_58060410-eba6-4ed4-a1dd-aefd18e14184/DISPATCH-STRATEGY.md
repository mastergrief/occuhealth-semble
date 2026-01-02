# Execution Strategy: Hero Landing Page

**Plan ID**: plan-hero-landing-2026-01-02
**Session**: 20260102_19-53_58060410-eba6-4ed4-a1dd-aefd18e14184
**Total Phases**: 6
**Total Estimated Tokens**: 133,000

---

## Phase 1: Foundation & Theme Setup

**Agent**: developer
**Memory**: `HERO_LANDING_SPRINT_01_FOUNDATION`
**Estimated Tokens**: 13,000

### Parallel Group 1 (spawn together with `run_in_background=true`)

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-1.1 | Add medical blue CSS variables to src/index.css | 5,000 |
| task-1.4 | Create directory structure: layout/, landing/, auth/ | 1,000 |

**Parent spawns**:
```
Task(subagent_type="developer", prompt="Phase 1 foundation: Add medical blue CSS vars and create directories. Read memory HERO_LANDING_SPRINT_01_FOUNDATION.", run_in_background=true)
```

### Sequential Group 1 (after Parallel Group 1)

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-1.2 | task-1.1 | Install 8 shadcn/ui components | 3,000 |
| task-1.3 | task-1.1 | Add medical button variant | 4,000 |

### Phase Gate
```bash
npm run typecheck
```
**Required files**: input.tsx, label.tsx, dialog.tsx, navigation-menu.tsx, sheet.tsx, avatar.tsx, badge.tsx, separator.tsx

---

## Phase 2: Layout Components

**Agent**: developer
**Memory**: `HERO_LANDING_SPRINT_02_LAYOUT`
**Estimated Tokens**: 19,000

### Sequential First: task-2.1

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-2.1 | Create Container.tsx (~15 lines) | 3,000 |

### Parallel Group 1 (after task-2.1)

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-2.2 | Create NavigationBar.tsx with Stethoscope logo, Sheet menu (~90 lines) | 8,000 |
| task-2.3 | Create Footer.tsx with 4-column grid, HIPAA/SSL badges (~85 lines) | 7,000 |

### Sequential Final: task-2.4

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-2.4 | task-2.1, task-2.2, task-2.3 | Create barrel export index.ts | 1,000 |

### Phase Gate
```bash
npm run typecheck
```
**Required files**: Container.tsx, NavigationBar.tsx, Footer.tsx, index.ts

---

## Phase 3: Landing Page Sections

**Agent**: developer
**Memory**: `HERO_LANDING_SPRINT_03_SECTIONS`
**Estimated Tokens**: 30,000

### Parallel Group 1 (spawn all 4 together)

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-3.1 | HeroSection: gradient, HIPAA badge, stats, CTAs (~85 lines) | 9,000 |
| task-3.2 | FeaturesSection: 6 cards with icons (~75 lines) | 8,000 |
| task-3.3 | TestimonialsSection: 3 cards with Avatar (~80 lines) | 7,000 |
| task-3.4 | CTASection: full-width medical blue bg (~50 lines) | 5,000 |

**Parent spawns**:
```
Task(subagent_type="developer", prompt="Create all 4 landing sections. Read HERO_LANDING_SPRINT_03_SECTIONS.", run_in_background=true)
```

### Sequential Final: task-3.5

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-3.5 | task-3.1-3.4 | Create barrel export index.ts | 1,000 |

### Phase Gate
```bash
npm run typecheck
```
**Required files**: HeroSection.tsx, FeaturesSection.tsx, TestimonialsSection.tsx, CTASection.tsx, index.ts

---

## Phase 4: Auth Component Refactor

**Agent**: developer
**Memory**: `HERO_LANDING_SPRINT_04_AUTH`
**Estimated Tokens**: 19,000

### Parallel Group 1

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-4.2 | SignOutButton (no deps, ~25 lines) | 3,000 |
| task-4.1 | SignInForm with loading, errors, flow toggle (~95 lines) | 10,000 |

### Sequential After: task-4.3, task-4.4

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-4.3 | task-4.1 | AuthModal Dialog wrapper (~45 lines) | 5,000 |
| task-4.4 | task-4.1-4.3 | Create barrel export index.ts | 1,000 |

### Phase Gate
```bash
npm run typecheck
```
**Required files**: SignInForm.tsx, SignOutButton.tsx, AuthModal.tsx, index.ts

---

## Phase 5: Integration & Polish

**Agent**: developer
**Memory**: `HERO_LANDING_SPRINT_05_INTEGRATION`
**Estimated Tokens**: 18,000

### Strictly Sequential

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-5.1 | task-4.3 | Update NavigationBar with AuthModal triggers | 6,000 |
| task-5.2 | task-5.1, task-3.5, task-4.4 | Replace App.tsx with modular version (~120 lines) | 12,000 |

### Phase Gate
```bash
npm run typecheck && curl -s -o /dev/null -w '%{http_code}' http://localhost:5173
```
**Expected**: Typecheck passes, HTTP 200 from dev server

---

## Phase 6: E2E Testing

**Agent**: browser
**Memory**: `HERO_LANDING_SPRINT_06_E2E_TESTING`
**Estimated Tokens**: 34,000

### Setup (task-6.1)

```bash
# Check port availability
lsof -ti:5175

# Start dev server on port 5175
VITE_PORT=5175 npm run dev:frontend &

# Browser-CLI commands
navigate http://localhost:5175
wait 2000
snapshot
screenshot tests/initial.png
```

### Parallel Test Group (after setup)

| Task ID | Description | Est. Tokens |
|---------|-------------|-------------|
| task-6.2 | Test landing sections: Hero, Features, Testimonials, Footer | 8,000 |
| task-6.3 | Test auth flow: modal, validation, login, signout | 10,000 |
| task-6.4 | Test responsive: mobile (375x812), tablet (768x1024), desktop | 5,000 |
| task-6.6 | Accessibility audit (auditAccessibility) | 3,000 |
| task-6.7 | Performance metrics (LCP < 2500ms, TTFB < 800ms) | 2,000 |

### Sequential Final: task-6.5

| Task ID | Depends On | Description | Est. Tokens |
|---------|------------|-------------|-------------|
| task-6.5 | task-6.2 | Save visual baselines | 3,000 |

### Phase Gate
```bash
test -f BROWSER-CLI/baselines/landing-hero.png
```
**Required artifacts**: landing-hero.png, landing-features.png, landing-testimonials.png, landing-structure.json

---

## Token Budget Summary

| Phase | Parallel | Sequential | Total | % of 120k |
|-------|----------|------------|-------|-----------|
| Phase 1 | 6,000 | 7,000 | 13,000 | 11% |
| Phase 2 | 15,000 | 4,000 | 19,000 | 16% |
| Phase 3 | 29,000 | 1,000 | 30,000 | 25% |
| Phase 4 | 13,000 | 6,000 | 19,000 | 16% |
| Phase 5 | 0 | 18,000 | 18,000 | 15% |
| Phase 6 | 28,000 | 6,000 | 34,000 | 28% |
| **Total** | 91,000 | 42,000 | **133,000** | **111%** |

**Note**: 111% utilization indicates this plan may require handoff mid-execution. Recommend checkpointing after Phase 3.

---

## Recommendations

1. **Single agent per phase**: Spawn one developer agent per phase for context continuity
2. **Gate enforcement**: Always verify typecheck before advancing phases
3. **Test credentials**: Browser agent needs `TEST_USER_NAME` and `TEST_PASSWORD` from `.env.local`
4. **Port conflicts**: Check `lsof -ti:5175` before Phase 6
5. **Checkpoint at Phase 3**: If token limit approaches, serialize state after Phase 3

---

## Risk Mitigations

| Risk | Phase | Mitigation |
|------|-------|------------|
| shadcn installation fails | 1 | Run components one at a time |
| Dark mode CSS issues | 1 | Test dark mode toggle, verify oklch values |
| Convex auth API changed | 4 | Read existing App.tsx first |
| Port 5175 in use | 6 | Kill existing process |
| Browser-CLI timeouts | 6 | Increase wait durations |

---

## Quick Start Commands

```bash
# Read strategy
cat ORCHESTRATION/context-hub/sessions/20260102_19-53_58060410-eba6-4ed4-a1dd-aefd18e14184/dispatch-strategy.json | jq .

# Check phase gate
npm run typecheck

# Start E2E testing
VITE_PORT=5175 npm run dev:frontend &
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5175
```
