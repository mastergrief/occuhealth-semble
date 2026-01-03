"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Doctor Auth Context (WorkOS AuthKit)
// ---------------------------------------------------------------------------
// Manages doctor authentication state separate from Convex Auth
// Tokens are stored in localStorage for persistence
// ---------------------------------------------------------------------------

interface Doctor {
  _id: Id<"doctorSettings">;
  workosUserId: string;
  email: string;
  name: string;
  zoomPersonalLink: string;
}

interface DoctorAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  doctor: Doctor | null;
  workosUserId: string | null;
  accessToken: string | null;
}

interface DoctorAuthContextType extends DoctorAuthState {
  loginAsDoctor: (workosUserId: string, accessToken: string, refreshToken: string) => void;
  logoutDoctor: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | null>(null);

const STORAGE_KEY = "workos_doctor_auth";

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
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
      console.error("Failed to load doctor auth from storage:", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsDoctor = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string) => {
      const newState = { workosUserId, accessToken, refreshToken };
      setAuthState(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    },
    []
  );

  const logoutDoctor = useCallback(() => {
    setAuthState({ workosUserId: null, accessToken: null, refreshToken: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Note: Doctor data would be queried via Convex useQuery in consuming components
  // This context manages only the WorkOS auth tokens
  const [doctor] = useState<Doctor | null>(null);

  const contextValue: DoctorAuthContextType = {
    isAuthenticated: !!authState.workosUserId,
    isLoading,
    doctor,
    workosUserId: authState.workosUserId,
    accessToken: authState.accessToken,
    loginAsDoctor,
    logoutDoctor,
  };

  return (
    <DoctorAuthContext.Provider value={contextValue}>
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error("useDoctorAuth must be used within a DoctorAuthProvider");
  }
  return context;
}
