# Improvement Roadmap

**Sprint**: 09 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: All previous sprints
**Next**: Complete ✓

---

## Prioritized Action Items

### 🔴 P0 - CRITICAL (Block Production)

| # | Issue | Location | Effort | Impact |
|---|-------|----------|--------|--------|
| 1 | **Authorization checks missing** | patients.ts, reports.ts, appointments.ts | 3 days | Data breach prevention |
| 2 | **GDPR soft-delete not filtered** | appointments.ts:27, reports.ts:30 | 1 day | Compliance |
| 3 | **Admin operations unauthenticated** | employers.ts:111 (verify) | 0.5 day | Privilege escalation |
| 4 | **No pagination on queries** | All list queries | 5 days | Scalability |

### 🟠 P1 - HIGH (Pre-Launch)

| # | Issue | Location | Effort | Impact |
|---|-------|----------|--------|--------|
| 5 | **Create authorization helper** | New: convex/auth.ts | 2 days | Foundation |
| 6 | **Add backend test coverage** | New: convex/*.test.ts | 5 days | Reliability |
| 7 | **Implement lazy loading** | App.tsx | 2 days | Bundle size |
| 8 | **Missing cascading delete** | gdpr.ts:processErasure | 1 day | GDPR complete |
| 9 | **Audit logging enforcement** | All mutations | 2 days | Compliance |
| 10 | **Frontend error display** | BookingFlow, EmployeeForm | 1 day | UX |
| 11 | **Add Error Boundaries** | App.tsx | 0.5 day | Crash recovery |

### 🟡 P2 - MEDIUM (Post-Launch)

| # | Issue | Location | Effort | Impact |
|---|-------|----------|--------|--------|
| 12 | **N+1 query optimization** | appointments.ts enrichment | 2 days | Performance |
| 13 | **Token refresh mechanism** | workos-auth.tsx | 2 days | Session handling |
| 14 | **Component memoization** | All list components | 2 days | Re-renders |
| 15 | **Vite chunk configuration** | vite.config.ts | 0.5 day | Build optimization |
| 16 | **Rate limiting on auth** | http.ts | 1 day | Security |
| 17 | **Data export API** | New: gdpr.ts | 2 days | GDPR Article 20 |

### 🟢 P3 - LOW (Nice to Have)

| # | Issue | Location | Effort | Impact |
|---|-------|----------|--------|--------|
| 18 | **Index name consistency** | schema.ts | 0.5 day | Code style |
| 19 | **Page naming consistency** | employer pages | 0.5 day | Code style |
| 20 | **List virtualization** | Long list components | 2 days | Performance |
| 21 | **useTransition adoption** | Non-critical updates | 1 day | UX polish |

---

## Phase Implementation Plan

### Phase 1: Security Foundation (Week 1-2)

**Goal**: Fix critical authorization gaps before any production data.

```
Day 1-2: Create authorization helper module
  - convex/authModules/authorization.ts
  - getAuthenticatedUser(ctx)
  - requireEmployerOwnership(ctx, employerId)
  - requireDoctorAccess(ctx, patientId)
  - requireAdmin(ctx)

Day 3-5: Add authorization to all queries
  - patients.list, patients.getById
  - reports.listByEmployer, reports.getById
  - appointments.listByEmployer, appointments.listByDate
  - employers.listAll, employers.verify (admin only)

Day 6-7: Fix GDPR soft-delete filtering
  - Add deletedAt filter to appointments.listByEmployer
  - Add deletedAt filter to reports.listByEmployer
  - Implement cascading delete in processErasure

Day 8-10: Add backend test coverage for auth
  - Test: employer A cannot read employer B's data
  - Test: unauthenticated requests return empty/error
  - Test: admin-only operations reject non-admins
```

### Phase 2: Scalability & UX (Week 3-4)

**Goal**: Enable scale and improve user experience.

```
Day 1-3: Implement pagination
  - patients.list → cursor-based pagination
  - appointments.listByEmployer → pagination
  - reports.listByEmployer → pagination
  - gdpr.getGDPRStats → use counters

Day 4-5: Frontend improvements
  - Add lazy loading for portal routes
  - Add Error Boundaries to App.tsx
  - Add error state to BookingFlow, EmployeeForm

Day 6-7: N+1 optimization
  - Batch patient lookups in appointments.listByEmployer
  - Batch patient lookups in reports.listByEmployer

Day 8-10: Testing
  - Add component tests for critical flows
  - Verify pagination works at scale
  - E2E tests for error scenarios
```

### Phase 3: Compliance & Polish (Week 5-6)

**Goal**: Complete GDPR compliance and polish.

```
Day 1-2: Audit logging enforcement
  - Add logAction calls to all mutations
  - Create audit decorator pattern

Day 3-4: GDPR completeness
  - Implement data export API
  - Add consent enforcement to patient operations
  - Document compliance mapping

Day 5-6: Token & session management
  - Implement proactive token refresh
  - Consider httpOnly cookie migration

Day 7-8: Performance polish
  - Add React.memo to list components
  - Configure Vite manual chunks
  - Add rate limiting to auth endpoints

Day 9-10: Documentation
  - Create deployment guide
  - Document API endpoints
  - Update architecture diagrams
```

---

## Validation Checkpoints

### After Phase 1
- [ ] Authorization tests pass (cross-employer access denied)
- [ ] GDPR soft-delete tests pass
- [ ] Admin-only operations protected
- [ ] Security audit passes

### After Phase 2
- [ ] Pagination works with 10,000+ records
- [ ] Bundle size reduced by >30%
- [ ] Error boundaries catch crashes
- [ ] E2E tests pass for error scenarios

### After Phase 3
- [ ] Audit logs recorded for all mutations
- [ ] Data export API functional
- [ ] Token refresh works automatically
- [ ] Deployment guide tested

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach before auth fix | HIGH | CRITICAL | Phase 1 priority, no prod data |
| Scalability issues | MEDIUM | HIGH | Phase 2 pagination |
| GDPR audit failure | MEDIUM | HIGH | Phase 3 compliance |
| Token expiration UX | LOW | MEDIUM | Phase 3 refresh |

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Authorization coverage | 0% | 100% | Week 2 |
| Backend test coverage | 0% | 60% | Week 4 |
| Bundle size | ~500KB | ~300KB | Week 4 |
| Query response time (1K records) | N/A (full load) | <200ms | Week 4 |
| GDPR compliance score | ~70% | 95% | Week 6 |
| Documentation coverage | 45% | 80% | Week 6 |

---

## Recommended Team Allocation

| Role | Focus | Weeks |
|------|-------|-------|
| Backend Dev | Authorization, pagination, tests | 1-4 |
| Frontend Dev | Lazy loading, error handling, memoization | 3-5 |
| DevOps | Deployment guide, CI/CD | 5-6 |
| QA | E2E tests, security testing | 2-6 |

---

## Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ORDER                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Authorization Helper ─────┐                              │
│         │                     │                              │
│         ▼                     ▼                              │
│  2. Query Auth Checks    3. Admin-Only Checks               │
│         │                     │                              │
│         └──────────┬──────────┘                              │
│                    ▼                                         │
│  4. GDPR Soft-Delete Filters                                 │
│         │                                                    │
│         ▼                                                    │
│  5. Backend Tests (verify auth works)                        │
│         │                                                    │
│         ▼                                                    │
│  6. Pagination (all queries)                                 │
│         │                     ┌──────────────────────────┐   │
│         │                     │ 7. Frontend Improvements │   │
│         │                     │    (parallel track)      │   │
│         ▼                     └──────────────────────────┘   │
│  8. N+1 Optimization                                         │
│         │                                                    │
│         ▼                                                    │
│  9. Audit Logging ────────▶ 10. GDPR Complete               │
│         │                                                    │
│         ▼                                                    │
│  11. Token Refresh                                           │
│         │                                                    │
│         ▼                                                    │
│  12. Documentation & Deploy                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Final Notes

The OccuHealth codebase is **well-architected and maintainable**. The critical issues are concentrated in authorization, which is a common pattern when transitioning from prototype to production.

With the Phase 1 security fixes in place, the application will be ready for production data. The subsequent phases improve scalability, compliance, and polish.

**Estimated total effort**: 6 weeks (1 developer)
**Recommended team size**: 2 developers + 1 QA = 3-4 weeks

---

✓ Final Sprint - OCCUHEALTH_EXPLORATION_INDEX contains all 9 sprints
