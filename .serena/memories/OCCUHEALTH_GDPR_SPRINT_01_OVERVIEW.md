# OccuHealth GDPR Pivot - Overview & Architecture

**Sprint**: 01 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: None
**Next**: OCCUHEALTH_GDPR_SPRINT_02_SCHEMA

---

## Executive Summary

Pivot from Semble pass-through to fully **Convex-native** occupational health booking system with UK GDPR compliance using Convex's Data Processing Agreement (DPA).

**Why this pivot?**
- Eliminate external API dependency (Semble)
- Full control over data storage and compliance
- Convex DPA provides GDPR processor compliance
- Simpler architecture (no webhooks, no sync)

---

## Business Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      OCCUHEALTH SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EMPLOYER/INSURER         DOCTOR              ADMIN             │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────────┐    │
│  │ 1. Register  │      │ 4. Review    │    │ Verify       │    │
│  │ 2. Add Staff │ ───► │    Patient   │    │ Employers    │    │
│  │ 3. Book Slot │      │ 5. Zoom Call │    │              │    │
│  │ 6. Get Report│ ◄─── │ 6. Submit    │    │ GDPR Dash    │    │
│  └──────────────┘      │    Report    │    └──────────────┘    │
│                        └──────────────┘                         │
│                                                                 │
│  Auth: WorkOS (MFA)    Auth: WorkOS        Auth: WorkOS        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │    CONVEX DB        │
                    │  (GDPR Compliant)   │
                    │  - Employers        │
                    │  - Patients         │
                    │  - Appointments     │
                    │  - Reports          │
                    │  - Consents         │
                    │  - Audit Logs       │
                    └─────────────────────┘
```

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | WorkOS for ALL users | MFA support, enterprise SSO |
| Data Storage | Convex only | GDPR via DPA, no external sync |
| Employer Verification | Manual admin approval | Simpler than API integration |
| Zoom Integration | Doctor's static PMI link | No Zoom API needed |
| GDPR Compliance | Built-in tables | Consent, audit, erasure tracking |

---

## User Types & Roles

| Role | Auth Method | Portal | Capabilities |
|------|-------------|--------|--------------|
| Employer/Insurer | WorkOS OAuth | `/employer/*` | Register, add employees, book, view reports |
| Doctor | WorkOS OAuth | `/doctor/*` | View appointments, manage schedule, submit reports |
| Admin | WorkOS OAuth | `/admin/*` | Verify employers, GDPR dashboard |

---

## What's Being Removed

- `convex/semble.ts` - External API client
- `convex/sembleWebhooks.ts` - Webhook handlers
- Semble tables in schema: `semblePatients`, `sembleAppointments`, `sembleWebhookEvents`
- All Semble environment variables

---

## Implementation Phases

1. **Schema & Cleanup** - Remove Semble, add GDPR tables
2. **WorkOS Auth** - Role-based routing for all users
3. **Employer Portal** - Registration, booking, reports
4. **Doctor Portal** - Appointments, schedule, report submission
5. **Admin & GDPR** - Verification queue, compliance dashboard

→ Next: OCCUHEALTH_GDPR_SPRINT_02_SCHEMA
