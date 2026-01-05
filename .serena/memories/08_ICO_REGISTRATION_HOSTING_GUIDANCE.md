# ICO Registration & Hosting Guidance

## Context
OccuHealth is built for a single doctor who already practices private medical reports. The doctor already has ICO registration for their practice.

---

## Key Relationships

| Role | Entity | ICO Status |
|------|--------|------------|
| Data Controller | Doctor (practice owner) | Already registered |
| Data Processor | Whoever hosts Convex/Vercel accounts | Needs registration if not the doctor |
| Developer | Builder of the app | No registration if no data access |

---

## Hosting Scenarios

### Scenario A: Developer Hosts (Current)
```
Developer owns Convex/Vercel accounts
         ↓
Developer = Data Processor
         ↓
Requires:
  - ICO registration (Tier 1: £40/year)
  - Data Processing Agreement with doctor
  - Ongoing data security responsibility
```

### Scenario B: Doctor Hosts (Recommended for Handover)
```
Doctor owns Convex/Vercel accounts
         ↓
Doctor = Data Controller (existing ICO reg covers it)
Convex/Vercel = Data Processors (have their own DPAs)
Developer = No ongoing role
         ↓
Requires:
  - Account transfer to doctor
  - No ICO registration for developer
  - Clean handover, no ongoing liability
```

---

## ICO Registration Tiers (2024/25)

| Tier | Staff | Turnover | Annual Fee |
|------|-------|----------|------------|
| Tier 1 | ≤10 | ≤£632k | £40 |
| Tier 2 | ≤250 | ≤£36m | £60 |
| Tier 3 | 250+ | £36m+ | £2,900 |

---

## For This Project

**Decision**: Transfer Convex and Vercel accounts to the doctor at handover.

**Rationale**:
- Doctor's existing ICO registration covers their use of the app
- No ongoing data processor liability for developer
- Cleaner separation of responsibilities
- Doctor has full control of their platform

---

## Landing Page Implications

- "GDPR Compliant" messaging is for **employer confidence**, not doctor education
- Doctors already understand data protection (they practice it daily)
- No need to prominently display ICO registration number
- Can mention in footer/privacy policy if desired

---

## Handover Checklist (ICO-Related)

- [ ] Create Convex account in doctor's name (or transfer)
- [ ] Create Vercel account in doctor's name (or transfer)
- [ ] Transfer domain ownership if applicable
- [ ] Provide all credentials securely
- [ ] Doctor confirms their ICO registration covers the platform
- [ ] No Data Processing Agreement needed (doctor controls everything)
