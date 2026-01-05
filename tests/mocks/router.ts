import { vi } from "vitest";

/**
 * Router location mock type
 */
export interface MockLocation {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  key?: string;
}

/**
 * Creates a mock location object for useLocation.
 *
 * @example
 * ```ts
 * import { useLocation } from "react-router-dom";
 * import { createMockLocation } from "../mocks/router";
 *
 * vi.mocked(useLocation).mockReturnValue(createMockLocation({
 *   pathname: "/doctor/dashboard",
 * }));
 * ```
 */
export function createMockLocation(overrides: Partial<MockLocation> = {}): MockLocation {
  return {
    pathname: "/",
    search: "",
    hash: "",
    state: null,
    key: "default",
    ...overrides,
  };
}

/**
 * Creates a mock navigate function for useNavigate.
 * Returns a vi.fn() that can be tracked for navigation calls.
 *
 * @example
 * ```ts
 * import { useNavigate } from "react-router-dom";
 * import { createMockNavigate } from "../mocks/router";
 *
 * const mockNavigate = createMockNavigate();
 * vi.mocked(useNavigate).mockReturnValue(mockNavigate);
 *
 * // Later in test
 * expect(mockNavigate).toHaveBeenCalledWith("/doctor/dashboard");
 * ```
 */
export function createMockNavigate(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

/**
 * Creates a mock params object for useParams.
 *
 * @example
 * ```ts
 * import { useParams } from "react-router-dom";
 * import { createMockParams } from "../mocks/router";
 *
 * vi.mocked(useParams).mockReturnValue(createMockParams({
 *   appointmentId: "abc123",
 * }));
 * ```
 */
export function createMockParams<T extends Record<string, string>>(
  params: T = {} as T
): T {
  return params;
}

/**
 * Doctor portal outlet context type
 */
export interface DoctorOutletContext {
  isAuthenticated: boolean;
  doctorSettings: {
    _id: string;
    workosUserId: string;
    name: string;
    specialization?: string;
    licenseNumber?: string;
    workingHours?: {
      start: string;
      end: string;
    };
    appointmentDuration?: number;
  } | null;
  isLoading: boolean;
}

/**
 * Creates a mock outlet context for doctor portal pages.
 * Use this with useOutletContext in DoctorLayout child components.
 *
 * @example
 * ```ts
 * import { useOutletContext } from "react-router-dom";
 * import { createMockDoctorOutletContext } from "../mocks/router";
 *
 * vi.mocked(useOutletContext).mockReturnValue(createMockDoctorOutletContext({
 *   isAuthenticated: true,
 *   doctorSettings: {
 *     _id: "doc123",
 *     workosUserId: "workos_123",
 *     name: "Dr. Smith",
 *   },
 * }));
 * ```
 */
export function createMockDoctorOutletContext(
  overrides: Partial<DoctorOutletContext> = {}
): DoctorOutletContext {
  return {
    isAuthenticated: false,
    doctorSettings: null,
    isLoading: false,
    ...overrides,
  };
}

/**
 * Employer portal outlet context type
 */
export interface EmployerOutletContext {
  isAuthenticated: boolean;
  employer: {
    _id: string;
    workosUserId: string;
    companyName: string;
    status: "pending" | "verified" | "rejected";
    contactEmail?: string;
  } | null;
  isVerified: boolean;
  isLoading: boolean;
}

/**
 * Creates a mock outlet context for employer portal pages.
 *
 * @example
 * ```ts
 * import { useOutletContext } from "react-router-dom";
 * import { createMockEmployerOutletContext } from "../mocks/router";
 *
 * vi.mocked(useOutletContext).mockReturnValue(createMockEmployerOutletContext({
 *   isAuthenticated: true,
 *   isVerified: true,
 *   employer: {
 *     _id: "emp123",
 *     workosUserId: "workos_456",
 *     companyName: "Test Corp",
 *     status: "verified",
 *   },
 * }));
 * ```
 */
export function createMockEmployerOutletContext(
  overrides: Partial<EmployerOutletContext> = {}
): EmployerOutletContext {
  return {
    isAuthenticated: false,
    employer: null,
    isVerified: false,
    isLoading: false,
    ...overrides,
  };
}

/**
 * Helper to reset all router mock implementations.
 * Call this in beforeEach or afterEach to reset state between tests.
 *
 * @example
 * ```ts
 * import { resetRouterMocks } from "../mocks/router";
 *
 * beforeEach(() => {
 *   resetRouterMocks();
 * });
 * ```
 */
export function resetRouterMocks() {
  const {
    useNavigate,
    useLocation,
    useParams,
    useOutletContext,
  } = require("react-router-dom");

  vi.mocked(useNavigate).mockReset().mockReturnValue(vi.fn());
  vi.mocked(useLocation).mockReset().mockReturnValue(createMockLocation());
  vi.mocked(useParams).mockReset().mockReturnValue({});
  vi.mocked(useOutletContext).mockReset();
}

/**
 * Comprehensive reset for both Convex and router mocks.
 * Convenience function for test setup.
 *
 * @example
 * ```ts
 * import { resetAllMocks } from "../mocks/router";
 *
 * beforeEach(() => {
 *   resetAllMocks();
 * });
 * ```
 */
export function resetAllMocks() {
  const { resetConvexMocks } = require("./convex");
  resetRouterMocks();
  resetConvexMocks();
}
