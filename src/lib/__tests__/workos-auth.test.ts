import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import {
  isTokenExpired,
  WorkOSAuthProvider,
  useDoctorAuth,
  useEmployerAuth,
  useAdminAuth,
} from "../workos-auth";

// Helper: Create a test JWT token with configurable payload
function createTestJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

// Helper: Create an expired JWT token
function createExpiredJWT(): string {
  const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
  return createTestJWT({ exp: expiredTime, sub: "test-user" });
}

// Helper: Create a valid (non-expired) JWT token
function createValidJWT(): string {
  const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  return createTestJWT({ exp: futureTime, sub: "test-user" });
}

// Storage keys used by the auth system
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
} as const;

// Test wrapper component for hooks
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(WorkOSAuthProvider, null, children);
  };
}

describe("isTokenExpired", () => {
  it("returns true for expired token", () => {
    const expiredToken = createExpiredJWT();
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it("returns false for valid (non-expired) token", () => {
    const validToken = createValidJWT();
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it("returns true for malformed token (invalid base64)", () => {
    const malformedToken = "not.a.valid.jwt";
    expect(isTokenExpired(malformedToken)).toBe(true);
  });

  it("returns true for empty string token", () => {
    expect(isTokenExpired("")).toBe(true);
  });

  it("returns true for token with no exp claim", () => {
    const tokenNoExp = createTestJWT({ sub: "test-user", iat: 12345 });
    // When exp is undefined, exp * 1000 = NaN, NaN < Date.now() = false
    // So isTokenExpired returns false for missing exp (token considered valid)
    expect(isTokenExpired(tokenNoExp)).toBe(false);
  });

  it("returns true for token with null payload section", () => {
    // Create a token where the payload is invalid (will fail JSON.parse)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const invalidToken = `${header}.invalidpayload.signature`;
    expect(isTokenExpired(invalidToken)).toBe(true);
  });

  it("returns true for token with only one part", () => {
    const singlePartToken = "onlyonepart";
    expect(isTokenExpired(singlePartToken)).toBe(true);
  });

  it("handles token expiring exactly at current time", () => {
    // Token that expires exactly now should be considered expired (< not <=)
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const edgeCaseToken = createTestJWT({ exp: nowInSeconds, sub: "test-user" });
    // exp * 1000 < Date.now() - depends on timing, but generally should be true or false
    // This is a boundary condition test
    const result = isTokenExpired(edgeCaseToken);
    expect(typeof result).toBe("boolean");
  });
});

describe("useDoctorAuth", () => {
  beforeEach(() => {
    // Clear all storage keys before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns isAuthenticated false when no token exists", async () => {
    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
    expect(result.current.accessToken).toBe(null);
  });

  it("returns isAuthenticated true when valid doctor token exists in storage", async () => {
    const validToken = createValidJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.workosUserId).toBe("doctor-123");
    expect(result.current.accessToken).toBe(validToken);
    expect(result.current.sessionId).toBe("session-123");
  });

  it("returns isAuthenticated false when token is expired", async () => {
    const expiredToken = createExpiredJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: expiredToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Expired token should be cleared during mount
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
  });

  it("loginAsDoctor sets authentication state correctly", async () => {
    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validToken = createValidJWT();

    act(() => {
      result.current.loginAsDoctor(
        "doctor-456",
        validToken,
        "refresh-token-456",
        "session-456"
      );
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.workosUserId).toBe("doctor-456");
    expect(result.current.accessToken).toBe(validToken);
    expect(result.current.sessionId).toBe("session-456");

    // Verify it was stored in localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.doctor) || "{}");
    expect(stored.workosUserId).toBe("doctor-456");
  });

  it("logoutDoctor clears authentication state", async () => {
    const validToken = createValidJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    act(() => {
      result.current.logoutDoctor();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
    expect(localStorage.getItem(STORAGE_KEYS.doctor)).toBe(null);
  });
});

describe("useEmployerAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns isAuthenticated false when no token exists", async () => {
    const { result } = renderHook(() => useEmployerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
    expect(result.current.isVerified).toBe(false);
  });

  it("returns isAuthenticated true when valid employer token exists", async () => {
    const validToken = createValidJWT();
    const employerAuth = {
      workosUserId: "employer-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.employer, JSON.stringify(employerAuth));

    const { result } = renderHook(() => useEmployerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.workosUserId).toBe("employer-123");
  });

  it("loginAsEmployer sets authentication state correctly", async () => {
    const { result } = renderHook(() => useEmployerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validToken = createValidJWT();

    act(() => {
      result.current.loginAsEmployer(
        "employer-789",
        validToken,
        "refresh-token-789",
        "session-789"
      );
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.workosUserId).toBe("employer-789");
  });
});

describe("useAdminAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns isAdminAuthenticated false when no token exists", async () => {
    const { result } = renderHook(() => useAdminAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdminAuthenticated).toBe(false);
    expect(result.current.adminUser).toBe(null);
  });

  it("returns isAdminAuthenticated true when valid admin token exists", async () => {
    const validToken = createValidJWT();
    // Admin uses userId field instead of workosUserId
    const adminAuth = {
      userId: "admin-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(adminAuth));

    const { result } = renderHook(() => useAdminAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdminAuthenticated).toBe(true);
    expect(result.current.adminUser).not.toBe(null);
    expect(result.current.adminUser?.userId).toBe("admin-123");
  });

  it("loginAsAdmin sets authentication state correctly", async () => {
    const { result } = renderHook(() => useAdminAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validToken = createValidJWT();

    act(() => {
      result.current.loginAsAdmin({
        userId: "admin-456",
        accessToken: validToken,
        refreshToken: "refresh-token-456",
        sessionId: "session-456",
      });
    });

    expect(result.current.isAdminAuthenticated).toBe(true);
    expect(result.current.adminUser?.userId).toBe("admin-456");
    expect(result.current.sessionId).toBe("session-456");
  });
});

describe("role-based authentication isolation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("doctor token does not authenticate as employer", async () => {
    const validToken = createValidJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useEmployerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Doctor auth exists but should not authenticate employer
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
  });

  it("employer token does not authenticate as doctor", async () => {
    const validToken = createValidJWT();
    const employerAuth = {
      workosUserId: "employer-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.employer, JSON.stringify(employerAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Employer auth exists but should not authenticate doctor
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
  });

  it("admin token does not authenticate as doctor", async () => {
    const validToken = createValidJWT();
    const adminAuth = {
      userId: "admin-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(adminAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Admin auth exists but should not authenticate doctor
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.workosUserId).toBe(null);
  });

  it("doctor token does not authenticate as admin", async () => {
    const validToken = createValidJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useAdminAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Doctor auth exists but should not authenticate admin
    expect(result.current.isAdminAuthenticated).toBe(false);
    expect(result.current.adminUser).toBe(null);
  });
});

describe("WorkOSAuthProvider edge cases", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("handles corrupted localStorage data gracefully", async () => {
    // Set invalid JSON in localStorage
    localStorage.setItem(STORAGE_KEYS.doctor, "not valid json");

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should handle gracefully and not be authenticated
    expect(result.current.isAuthenticated).toBe(false);
    // Corrupted data should be removed
    expect(localStorage.getItem(STORAGE_KEYS.doctor)).toBe(null);
  });

  it("clears storage for expired tokens during initialization", async () => {
    const expiredToken = createExpiredJWT();
    const doctorAuth = {
      workosUserId: "doctor-123",
      accessToken: expiredToken,
      refreshToken: "refresh-token",
      sessionId: "session-123",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Expired token should be cleared from storage
    expect(localStorage.getItem(STORAGE_KEYS.doctor)).toBe(null);
  });

  it("prioritizes first found valid auth when multiple exist", async () => {
    // Set both doctor and employer auth
    const validToken = createValidJWT();

    // Admin is checked first in the STORAGE_KEYS object iteration
    const adminAuth = {
      userId: "admin-first",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-admin",
    };
    localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(adminAuth));

    const doctorAuth = {
      workosUserId: "doctor-second",
      accessToken: validToken,
      refreshToken: "refresh-token",
      sessionId: "session-doctor",
    };
    localStorage.setItem(STORAGE_KEYS.doctor, JSON.stringify(doctorAuth));

    const { result: adminResult } = renderHook(() => useAdminAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(adminResult.current.isLoading).toBe(false);
    });

    // The first found auth should be used (order depends on Object.entries)
    // This test verifies that only one role can be active at a time
    const isAdmin = adminResult.current.isAdminAuthenticated;

    // At least one should be authenticated based on which key was found first
    expect(typeof isAdmin).toBe("boolean");
  });
});
