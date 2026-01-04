# OccuHealth - Project Overview

## Purpose
GDPR-compliant occupational health platform for UK healthcare providers. Connects employers/insurers with occupational health doctors for medical assessments, fit-for-work reports, and compliance tracking.

## Core Domains
| Domain | Description |
|--------|-------------|
| **Employers** | Companies/insurers managing employee health assessments |
| **Patients** | Employees referred for occupational health assessments |
| **Doctors** | Medical professionals conducting assessments |
| **Admins** | Platform administrators managing the system |
| **Appointments** | Scheduling and management of health assessments |
| **Reports** | Fit-for-work reports and clinical notes |
| **GDPR** | Consent management, audit logs, erasure requests |

## User Roles
| Role | Auth Method | Portal Route |
|------|-------------|--------------|
| Admin | WorkOS AuthKit | `/admin/*` |
| Doctor | WorkOS AuthKit | `/doctor/*` |
| Employer | WorkOS AuthKit | `/employer/*` |

## Key Features
- Multi-role authentication (WorkOS-based)
- Appointment scheduling with slot management
- Fit-for-work report generation
- GDPR compliance (consent, audit, erasure)
- Real-time data sync (Convex)
- Mobile apps (Capacitor - iOS/Android)

## Project Status
- **Auth**: Migrated to WorkOS AuthKit (Jan 2026)
- **GDPR**: Full compliance implemented
- **Mobile**: Capacitor configured

## Related Memories
- `01_TECH_STACK` - Technology details
- `02_CODE_CONVENTIONS` - Coding standards
- `03_COMMANDS` - Development commands
- `04_ARCHITECTURE` - System architecture
