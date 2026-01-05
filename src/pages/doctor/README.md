# Doctor Portal Pages

## Overview

The Doctor Portal provides occupational health doctors with tools to manage appointments,
schedules, and fitness-for-work reports for the OccuHealth platform.

## Architecture

```
DoctorLayout (Authentication + Sidebar)
├── Dashboard     - Today's schedule overview
├── Appointments  - Date-based appointment management
├── Schedule      - Time slot availability management
├── Reports       - Fitness report creation
└── Settings      - Profile and Zoom link management
```

## Page Responsibilities

### Dashboard (`Dashboard.tsx`)
- Displays today's appointments
- Shows completion statistics (Total, Completed, Remaining)
- Provides Zoom meeting links for scheduled appointments

### Appointments (`Appointments.tsx`)
- Browse appointments by date
- Mark appointments as complete
- View patient and employer information

### Schedule (`Schedule.tsx`)
- Create available time slots
- Block unavailable times
- View booking status

### Reports (`Reports.tsx`)
- Create fitness-for-work assessments
- Submit reports to employers
- Track completed assessments

### Settings (`Settings.tsx`)
- Update Zoom meeting link
- View profile information

## Data Flow

All pages receive doctor context from DoctorLayout:
```tsx
const { doctor } = useDoctorContext();
```

Pages fetch data via Convex queries:
```tsx
const appointments = useQuery(api.appointments.getTodaysAppointments);
```

Mutations update data with real-time refresh:
```tsx
const markCompleted = useMutation(api.appointments.markCompleted);
```

## Testing

### Unit Tests
Located in `src/pages/doctor/__tests__/`:
- Dashboard.test.tsx
- Appointments.test.tsx
- Schedule.test.tsx
- Reports.test.tsx
- Settings.test.tsx

Run tests:
```bash
npm run test
```

### E2E Tests
Browser-CLI test states available:
- `authenticated-doctor-fresh` - Fresh authenticated state

## Type Definitions

Shared types in `src/types/doctor.ts`:
- `DoctorContextType` - Layout context interface
- `FitForWorkStatus` - Report fitness status
- `AppointmentStatus` - Appointment states
- `SlotStatus` - Schedule slot states

## Related Documentation

- `NAV-MAP.md` - Route documentation and selectors
- `DOCTOR_PORTAL_SPRINT_INDEX` - Implementation sprints
- Serena memories for architecture details
