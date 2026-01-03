"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Employer Auth Context (WorkOS AuthKit)
// ---------------------------------------------------------------------------
// Manages employer authentication state separate from Convex Auth
// Tokens are stored in localStorage for persistence
// ---------------------------------------------------------------------------

interface Employer {
  _id: Id<"employers">;
  workosUserId: string;
  email: string;
  companyName: string;
  companyType: "employer" | "insurer";
  status: "pending" | "verified" | "rejected";
  contactName: string;
}

interface EmployerAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  employer: Employer | null;
  workosUserId: string | null;
  accessToken: string | null;
  isVerified: boolean;
}

interface EmployerAuthContextType extends EmployerAuthState {
  loginAsEmployer: (workosUserId: string, accessToken: string, refreshToken: string) => void;
  logoutEmployer: () => void;
}

const EmployerAuthContext = createContext<EmployerAuthContextType | null>(null);

const STORAGE_KEY = "workos_employer_auth";

export function EmployerAuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{
    workosUserId: string | null;
    accessToken: string | null;
    refreshToken: string | null;
  }>({
    workosUserId: null,
    accessToken: null,
    refreshToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setAuthState(parsed);
      }
    } catch (err) {
      console.error("Failed to load employer auth from storage:", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsEmployer = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string) => {
      const newState = { workosUserId, accessToken, refreshToken };
      setAuthState(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    },
    []
  );

  const logoutEmployer = useCallback(() => {
    setAuthState({ workosUserId: null, accessToken: null, refreshToken: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Note: Employer data would be queried via Convex useQuery in consuming components
  // This context manages only the WorkOS auth tokens
  // The employer state will be set when queried from Convex
  const [employer] = useState<Employer | null>(null);

  const contextValue: EmployerAuthContextType = {
    isAuthenticated: !!authState.workosUserId,
    isLoading,
    employer,
    workosUserId: authState.workosUserId,
    accessToken: authState.accessToken,
    isVerified: employer?.status === "verified" || false,
    loginAsEmployer,
    logoutEmployer,
  };

  return (
    <EmployerAuthContext.Provider value={contextValue}>
      {children}
    </EmployerAuthContext.Provider>
  );
}

export function useEmployerAuth() {
  const context = useContext(EmployerAuthContext);
  if (!context) {
    throw new Error("useEmployerAuth must be used within an EmployerAuthProvider");
  }
  return context;
}
