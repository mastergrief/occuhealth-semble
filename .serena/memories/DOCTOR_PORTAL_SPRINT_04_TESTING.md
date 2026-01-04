# Doctor Portal - Testing Strategy

**Sprint**: 04 of 06
**Index**: DOCTOR_PORTAL_SPRINT_INDEX
**Depends On**: DOCTOR_PORTAL_SPRINT_01_ROUTING_FIX, DOCTOR_PORTAL_SPRINT_02_SECURITY
**Next**: DOCTOR_PORTAL_SPRINT_05_BROWSER_TESTING
**Priority**: P1 - HIGH (Quality assurance)

---

## Executive Summary

The Doctor Portal has **minimal test coverage**: 13 E2E tests for auth only, zero unit tests, zero integration tests. This sprint establishes the testing infrastructure and priority test cases.

**Current Coverage**: ~10% | **Target Coverage**: 80% | **Effort**: 8-12 hours

---

## Current Test Landscape

### Existing Tests

| Type | Location | Count | Coverage |
|------|----------|-------|----------|
| E2E (Playwright) | `tests/e2e/auth/` | 13 | Auth flows only |
| Unit (Vitest) | None | 0 | 0% |
| Integration | None | 0 | 0% |

### Unused Infrastructure
- `tests/e2e/fixtures/auth.fixture.ts` - Has `authenticatedDoctorPage` but NOT IMPORTED anywhere

---

## Testing Framework Setup

### 1. Install Vitest + Testing Library

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

### 2. Create vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/pages/doctor/**', 'src/lib/workos-auth.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Create tests/setup.ts

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});
```

---

## Priority Test Cases

### P0: Authentication (Unit Tests)

**File**: `src/lib/__tests__/workos-auth.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isTokenExpired } from '../workos-auth';

describe('isTokenExpired', () => {
  it('returns true for expired token', () => {
    const expiredToken = createJWT({ exp: Date.now() / 1000 - 100 });
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it('returns false for valid token', () => {
    const validToken = createJWT({ exp: Date.now() / 1000 + 3600 });
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it('returns true for malformed token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });
});

describe('useDoctorAuth', () => {
  it('returns isAuthenticated true when role is doctor', () => {
    // Test with mocked localStorage
  });

  it('returns isAuthenticated false for other roles', () => {
    // Test employer/admin tokens return false
  });
});

// Helper to create test JWTs
function createJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}
```

---

### P1: Component Rendering (Integration Tests)

**File**: `src/pages/doctor/__tests__/Dashboard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoctorDashboard } from '../Dashboard';
import { useQuery } from 'convex/react';
import { useOutletContext } from 'react-router-dom';

vi.mock('convex/react');
vi.mock('react-router-dom', () => ({
  useOutletContext: vi.fn(),
}));

const mockDoctor = {
  _id: 'doctor_123',
  name: 'Dr. Test',
  email: 'test@doctor.com',
  zoomPersonalLink: 'https://zoom.us/j/123',
};

const mockAppointments = [
  { _id: 'apt_1', status: 'scheduled', scheduledTime: '09:00', patient: { name: 'John' } },
  { _id: 'apt_2', status: 'completed', scheduledTime: '10:00', patient: { name: 'Jane' } },
];

describe('DoctorDashboard', () => {
  beforeEach(() => {
    vi.mocked(useOutletContext).mockReturnValue({ doctor: mockDoctor });
    vi.mocked(useQuery).mockReturnValue(mockAppointments);
  });

  it('renders stats cards', () => {
    render(<DoctorDashboard />);
    
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText('Total Today')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('calculates correct stats', () => {
    render(<DoctorDashboard />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Total
    expect(screen.getByText('1')).toBeInTheDocument(); // Completed (filtered)
  });

  it('shows empty state when no appointments', () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<DoctorDashboard />);
    
    expect(screen.getByText('No appointments today')).toBeInTheDocument();
  });

  it('renders Zoom join button for scheduled appointments', () => {
    render(<DoctorDashboard />);
    
    const joinButtons = screen.getAllByRole('link', { name: /join zoom/i });
    expect(joinButtons).toHaveLength(1); // Only scheduled appointments
  });
});
```

---

### P1: Mutation Flow Tests

**File**: `src/pages/doctor/__tests__/Appointments.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoctorAppointments } from '../Appointments';
import { useQuery, useMutation } from 'convex/react';

vi.mock('convex/react');

describe('DoctorAppointments', () => {
  const mockMarkCompleted = vi.fn();
  
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      items: [
        { _id: 'apt_1', status: 'scheduled', patient: { name: 'John' } },
      ],
    });
    vi.mocked(useMutation).mockReturnValue(mockMarkCompleted);
  });

  it('calls markCompleted when Complete button clicked', async () => {
    render(<DoctorAppointments />);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalledWith({
        appointmentId: 'apt_1',
      });
    });
  });

  it('disables button during mutation', async () => {
    mockMarkCompleted.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<DoctorAppointments />);
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(completeButton).toBeDisabled();
      expect(completeButton).toHaveTextContent(/completing/i);
    });
  });
});
```

---

### P2: Backend Security Tests

**File**: `convex/__tests__/authorization.test.ts`

```typescript
// Run with: npx convex test

import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { api } from '../_generated/api';

test('createSlots requires doctor role', async () => {
  const t = convexTest();
  
  // As employer (should fail)
  await t.run(async (ctx) => {
    // Mock non-doctor auth
    await expect(
      ctx.mutation(api.availableSlots.createSlots, {
        slots: [{ date: '2026-01-15', startTime: '09:00', endTime: '09:30' }],
      })
    ).rejects.toThrow('DOCTOR_NOT_FOUND');
  });
});

test('blockSlot requires slot ownership', async () => {
  const t = convexTest();
  
  await t.run(async (ctx) => {
    // Create slot as Doctor A
    const doctorA = await createDoctor(ctx, 'A');
    const slotId = await ctx.mutation(api.availableSlots.createSlots, {
      slots: [{ date: '2026-01-15', startTime: '09:00', endTime: '09:30' }],
    });
    
    // Try to block as Doctor B (should fail)
    await switchToDoctor(ctx, 'B');
    await expect(
      ctx.mutation(api.availableSlots.blockSlot, { slotId })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});

test('doctorSettings.update validates Zoom URL', async () => {
  const t = convexTest();
  
  await t.run(async (ctx) => {
    const doctor = await createDoctor(ctx);
    
    // Invalid URL (should fail)
    await expect(
      ctx.mutation(api.doctorSettings.update, {
        doctorId: doctor._id,
        zoomPersonalLink: 'javascript:alert(1)',
      })
    ).rejects.toThrow('INVALID_URL');
    
    // Valid URL (should succeed)
    await ctx.mutation(api.doctorSettings.update, {
      doctorId: doctor._id,
      zoomPersonalLink: 'https://zoom.us/j/123456',
    });
  });
});
```

---

## Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:doctor": "playwright test tests/e2e/doctor/",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## Test Directory Structure

```
tests/
├── setup.ts                    # Global test setup
├── mocks/
│   ├── convex.ts              # Convex hook mocks
│   └── router.ts              # React Router mocks
├── unit/
│   └── workos-auth.test.ts    # Auth utility tests
├── e2e/
│   ├── auth/                  # Existing auth tests
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── doctor/                # NEW: Doctor portal tests
│   │   ├── dashboard.spec.ts
│   │   ├── appointments.spec.ts
│   │   ├── schedule.spec.ts
│   │   ├── reports.spec.ts
│   │   └── settings.spec.ts
│   └── fixtures/
│       └── auth.fixture.ts    # Auth fixtures (update to use)
└── convex/                    # Backend tests
    └── authorization.test.ts

src/pages/doctor/
├── __tests__/                 # Co-located component tests
│   ├── Dashboard.test.tsx
│   ├── Appointments.test.tsx
│   ├── Schedule.test.tsx
│   ├── Reports.test.tsx
│   └── Settings.test.tsx
```

---

## Acceptance Criteria

- [ ] Vitest configured and running
- [ ] At least 5 unit tests for workos-auth
- [ ] At least 3 integration tests per doctor page
- [ ] Security tests for authorization mutations
- [ ] Test coverage report generated
- [ ] CI pipeline updated (if exists)

---

## Coverage Targets

| Component | Current | Target |
|-----------|---------|--------|
| `workos-auth.tsx` | 0% | 80% |
| `DoctorLayout.tsx` | 0% | 60% |
| `Dashboard.tsx` | 0% | 80% |
| `Appointments.tsx` | 0% | 80% |
| `Schedule.tsx` | 0% | 70% |
| `Reports.tsx` | 0% | 70% |
| `Settings.tsx` | 0% | 80% |

---

## Next Steps

After this sprint, proceed to **Sprint 05: Browser-CLI Testing** for E2E test implementation using the browser agent.

---

→ Next: DOCTOR_PORTAL_SPRINT_05_BROWSER_TESTING
