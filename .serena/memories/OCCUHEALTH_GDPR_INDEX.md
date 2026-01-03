# OCCUHEALTH_GDPR - Sprint Index

**Created**: 2026-01-03
**Total Sprints**: 6
**Total Words**: ~2,950
**Scope**: Pivot from Semble to Convex-native GDPR-compliant occupational health booking system

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | OCCUHEALTH_GDPR_SPRINT_01_OVERVIEW | ~400 | Ready | None |
| 02 | OCCUHEALTH_GDPR_SPRINT_02_SCHEMA | ~550 | Ready | 01 |
| 03 | OCCUHEALTH_GDPR_SPRINT_03_AUTH | ~450 | Ready | 02 |
| 04 | OCCUHEALTH_GDPR_SPRINT_04_EMPLOYER | ~500 | Ready | 03 |
| 05 | OCCUHEALTH_GDPR_SPRINT_05_DOCTOR | ~500 | Ready | 03 |
| 06 | OCCUHEALTH_GDPR_SPRINT_06_ADMIN_GDPR | ~550 | Ready | 04, 05 |

---

## Reading Order

### Foundation
1. **SPRINT_01_OVERVIEW** - Business flow, architecture decisions, what's being removed

### Backend
2. **SPRINT_02_SCHEMA** - Database tables, files to delete/modify
3. **SPRINT_03_AUTH** - WorkOS routing for all users

### Frontend Portals
4. **SPRINT_04_EMPLOYER** - Employer portal: employees, booking, reports
5. **SPRINT_05_DOCTOR** - Doctor portal: schedule, appointments, report creation

### Compliance
6. **SPRINT_06_ADMIN_GDPR** - Verification queue, erasure, audit logging

---

## Topic Cross-Reference

### Authentication
- WorkOS for all users → Sprint 01, Sprint 03
- Role-based routing → Sprint 03
- Employer registration flow → Sprint 03, Sprint 04

### Schema & Data
- Table definitions → Sprint 02
- Indexes → Sprint 02
- GDPR tables → Sprint 02, Sprint 06

### Employer Portal
- Routes → Sprint 04
- Components → Sprint 04
- Booking flow → Sprint 04
- Patient/consent → Sprint 04

### Doctor Portal
- Routes → Sprint 05
- Schedule management → Sprint 05
- Report creation → Sprint 05
- Clinical notes → Sprint 05

### GDPR Compliance
- Consent types → Sprint 04, Sprint 06
- Audit logging → Sprint 06
- Erasure requests → Sprint 06
- Data export → Sprint 06

### Admin Features
- Employer verification → Sprint 06
- GDPR dashboard → Sprint 06

---

## Key Files Reference

### To Delete
- `convex/semble.ts`
- `convex/sembleWebhooks.ts`

### To Modify
- `convex/schema.ts` - New tables
- `convex/http.ts` - Auth routing
- `src/App.tsx` - New routes
- `package.json` - Remove script

### To Create
```
convex/
├── employers.ts
├── doctorSettings.ts
├── patients.ts
├── appointments.ts
├── availableSlots.ts
├── reports.ts
├── gdpr.ts

src/components/
├── employer/ (8 components)
├── doctor/ (7 components)

src/pages/
├── EmployerLayout.tsx
├── DoctorLayout.tsx
├── employer/ (5 pages)
├── doctor/ (5 pages)
├── admin/
│   ├── EmployerVerification.tsx
│   └── GDPRDashboard.tsx
```

---

## Key Decisions Summary

| Decision | Choice | Sprint |
|----------|--------|--------|
| Auth System | WorkOS for all | 01, 03 |
| Data Storage | Convex only | 01, 02 |
| Employer Verification | Manual admin | 01, 06 |
| Zoom Integration | Doctor's PMI link | 01, 05 |
| GDPR Compliance | Built-in tables | 02, 06 |
| Clinical Notes | Private (not shared) | 05 |

---

## Related Memories

**Superseded** (can be archived):
- `feature_catalog_semble_integration` - Old Semble approach

**Current project docs**:
- `code_conventions_and_structure` - Coding standards
- `landing_auth_architecture` - Existing auth patterns
- `component_system_landing_auth_pages` - Component patterns

---

## Update Log

| Date | Change |
|------|--------|
| 2026-01-03 | Initial sprint documentation created |
