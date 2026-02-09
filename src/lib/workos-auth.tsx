import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { Id } from "../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

export type UserRole = "admin" | "employer" | "doctor";

export interface AuthTokens {
  workosUserId: string;
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
}

interface WorkOSAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
  role: UserRole | null;
}

interface WorkOSAuthContextType extends WorkOSAuthState {
  login: (role: UserRole, tokens: AuthTokens) => void;
  logout: () => void;
}

// Legacy types for backward compatibility
interface AdminUser {
  userId: string;
  accessToken: string;
  refreshToken?: string;
}

interface Employer {
  _id: Id<"employers">;
  workosUserId: string;
  email: string;
  companyName: string;
  companyType: "employer" | "insurer";
  status: "pending" | "verified" | "rejected";
  contactName: string;
}

interface Doctor {
  _id: Id<"doctorSettings">;
  workosUserId: string;
  email: string;
  name: string;
  zoomPersonalLink: string;
}

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};

// =============================================================================
// Context
// =============================================================================

const WorkOSAuthContext = createContext<WorkOSAuthContextType | undefined>(
  undefined
);

// =============================================================================
// Token Expiration Check
// =============================================================================

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};


// =============================================================================
// Token Refresh Mutex
// =============================================================================

// Token refresh mutex to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

/**
 * Refresh access token using refresh token
 * Uses mutex to prevent concurrent refresh attempts
 */
export async function refreshAccessToken(
  refreshToken: string,
  role: UserRole
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // Mutex: If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
      // Convert .convex.cloud to .convex.site for HTTP actions
      const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

      const response = await fetch(`${siteUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error("Token refresh failed:", response.status);
        return null;
      }

      const tokens = await response.json();

      // Update localStorage with new tokens
      const storageKey = STORAGE_KEYS[role];
      const existing = localStorage.getItem(storageKey);
      if (existing) {
        const data = JSON.parse(existing);
        data.accessToken = tokens.accessToken;
        data.refreshToken = tokens.refreshToken;
        localStorage.setItem(storageKey, JSON.stringify(data));
      }

      return tokens;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// =============================================================================
// Provider Component
// =============================================================================

export function WorkOSAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkOSAuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
    role: null,
  });

  // Load from localStorage on mount (check all role keys)
  useEffect(() => {
    for (const [role, key] of Object.entries(STORAGE_KEYS)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);

          // Check token expiration
          if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
            localStorage.removeItem(key);
            continue;
          }

          // Normalize legacy userId field to workosUserId (admin uses userId)
          const tokens: AuthTokens = {
            workosUserId: parsed.workosUserId || parsed.userId,
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            sessionId: parsed.sessionId,
          };

          setState({
            isAuthenticated: true,
            isLoading: false,
            tokens,
            role: role as UserRole,
          });
          return;
        }
      } catch (err) {
        console.error(`Failed to load ${role} auth:`, err);
        localStorage.removeItem(key);
      }
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  // Multi-tab sync via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const roleEntry = Object.entries(STORAGE_KEYS).find(
        ([, key]) => key === e.key
      );
      if (!roleEntry) return;

      const [role] = roleEntry;
      if (e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const tokens: AuthTokens = {
            workosUserId: parsed.workosUserId || parsed.userId,
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            sessionId: parsed.sessionId,
          };
          setState({
            isAuthenticated: true,
            isLoading: false,
            tokens,
            role: role as UserRole,
          });
        } catch {
          // Invalid JSON in storage, ignore
        }
      } else if (state.role === role) {
        // Our role was logged out in another tab
        setState({
          isAuthenticated: false,
          isLoading: false,
          tokens: null,
          role: null,
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [state.role]);

  const login = useCallback((role: UserRole, tokens: AuthTokens) => {
    // Store with role-appropriate field names for backward compatibility
    const storageData =
      role === "admin"
        ? {
            userId: tokens.workosUserId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            sessionId: tokens.sessionId,
          }
        : {
            workosUserId: tokens.workosUserId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            sessionId: tokens.sessionId,
          };

    localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
    // Notify same-tab listeners (native StorageEvent only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS[role],
      newValue: JSON.stringify(storageData),
    }));
    setState({
      isAuthenticated: true,
      isLoading: false,
      tokens,
      role,
    });
  }, []);

  const logout = useCallback(() => {
    if (state.role) {
      const key = STORAGE_KEYS[state.role];
      localStorage.removeItem(key);
      // Notify same-tab listeners
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: null,
      }));
    }
    setState({
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
      role: null,
    });
  }, [state.role]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<WorkOSAuthContextType>(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout]
  );

  return (
    <WorkOSAuthContext.Provider value={contextValue}>
      {children}
    </WorkOSAuthContext.Provider>
  );
}

// =============================================================================
// Generic Hook
// =============================================================================

export function useWorkOSAuth() {
  const context = useContext(WorkOSAuthContext);
  if (!context) {
    throw new Error("useWorkOSAuth must be used within WorkOSAuthProvider");
  }
  return context;
}

// =============================================================================
// Backward-Compatible Role-Specific Hooks
// =============================================================================

/**
 * Backward-compatible hook for admin authentication.
 * Matches the existing useAdminAuth interface exactly.
 */
export function useAdminAuth(): {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  loginAsAdmin: (params: {
    accessToken: string;
    refreshToken?: string;
    userId: string;
    sessionId?: string;
  }) => void;
  logoutAdmin: () => void;
} {
  const auth = useWorkOSAuth();

  const adminUser: AdminUser | null =
    auth.role === "admin" && auth.tokens
      ? {
          userId: auth.tokens.workosUserId,
          accessToken: auth.tokens.accessToken,
          refreshToken: auth.tokens.refreshToken,
        }
      : null;

  const loginAsAdmin = useCallback(
    (params: { accessToken: string; refreshToken?: string; userId: string; sessionId?: string }) => {
      auth.login("admin", {
        workosUserId: params.userId,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        sessionId: params.sessionId,
      });
    },
    [auth]
  );

  return {
    adminUser,
    isAdminAuthenticated: auth.role === "admin" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    sessionId: auth.role === "admin" ? (auth.tokens?.sessionId ?? null) : null,
    loginAsAdmin,
    logoutAdmin: auth.logout,
  };
}

/**
 * Backward-compatible hook for employer authentication.
 * Matches the existing useEmployerAuth interface exactly.
 */
export function useEmployerAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  employer: Employer | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  isVerified: boolean;
  loginAsEmployer: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutEmployer: () => void;
} {
  const auth = useWorkOSAuth();

  const loginAsEmployer = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
      auth.login("employer", { workosUserId, accessToken, refreshToken, sessionId });
    },
    [auth]
  );

  // Note: employer data is fetched via Convex useQuery in consuming components
  // This context only manages WorkOS auth tokens
  return {
    isAuthenticated: auth.role === "employer" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    employer: null, // Fetched via Convex in consuming components
    workosUserId:
      auth.role === "employer" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken:
      auth.role === "employer" ? (auth.tokens?.accessToken ?? null) : null,
    sessionId:
      auth.role === "employer" ? (auth.tokens?.sessionId ?? null) : null,
    isVerified: false, // Determined by employer status from Convex
    loginAsEmployer,
    logoutEmployer: auth.logout,
  };
}

/**
 * Backward-compatible hook for doctor authentication.
 * Matches the existing useDoctorAuth interface exactly.
 */
export function useDoctorAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  doctor: Doctor | null;
  workosUserId: string | null;
  accessToken: string | null;
  sessionId: string | null;
  loginAsDoctor: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutDoctor: () => void;
} {
  const auth = useWorkOSAuth();

  const loginAsDoctor = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string, sessionId?: string) => {
      auth.login("doctor", { workosUserId, accessToken, refreshToken, sessionId });
    },
    [auth]
  );

  // Note: doctor data is fetched via Convex useQuery in consuming components
  // This context only manages WorkOS auth tokens
  return {
    isAuthenticated: auth.role === "doctor" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    doctor: null, // Fetched via Convex in consuming components
    workosUserId:
      auth.role === "doctor" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken:
      auth.role === "doctor" ? (auth.tokens?.accessToken ?? null) : null,
    sessionId:
      auth.role === "doctor" ? (auth.tokens?.sessionId ?? null) : null,
    loginAsDoctor,
    logoutDoctor: auth.logout,
  };
}

// =============================================================================
// Backward-Compatible Provider Aliases
// =============================================================================

/**
 * Backward-compatible alias for EmployerAuthProvider.
 * Simply re-exports WorkOSAuthProvider since the unified provider handles all roles.
 */
export const EmployerAuthProvider = WorkOSAuthProvider;

/**
 * Backward-compatible alias for DoctorAuthProvider.
 * Simply re-exports WorkOSAuthProvider since the unified provider handles all roles.
 */
export const DoctorAuthProvider = WorkOSAuthProvider;
