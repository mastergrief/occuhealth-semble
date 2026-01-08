import { StrictMode, useCallback, useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { WorkOSAuthProvider, refreshAccessToken, type UserRole } from "./lib/workos-auth";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Storage keys (must match workos-auth.tsx)
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
} as const;

type RoleKey = keyof typeof STORAGE_KEYS;

// Custom useAuth hook that adapts localStorage tokens to AuthKit interface
// This allows using ConvexProviderWithAuthKit with our server-side OAuth flow
function useLocalStorageAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; role: RoleKey } | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      for (const [role, key] of Object.entries(STORAGE_KEYS) as [RoleKey, string][]) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const userId = parsed.workosUserId || parsed.userId;
            if (userId && parsed.accessToken) {
              setUser({ id: userId, role });
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }
      setUser(null);
      setIsLoading(false);
    };

    loadUser();

    // Listen for storage changes (multi-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key && (Object.values(STORAGE_KEYS) as string[]).includes(e.key)) {
        loadUser();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // getAccessToken function required by ConvexProviderWithAuthKit
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Priority: admin > employer > doctor
    for (const [role, key] of Object.entries(STORAGE_KEYS) as [RoleKey, string][]) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.accessToken) {
            // Check if token is expired
            try {
              const payload = JSON.parse(atob(parsed.accessToken.split(".")[1]));
              if (payload.exp * 1000 < Date.now()) {
                // Token expired, try to refresh
                if (parsed.refreshToken) {
                  const newTokens = await refreshAccessToken(parsed.refreshToken, role as UserRole);
                  return newTokens?.accessToken ?? null;
                }
                continue; // Skip expired token without refresh token
              }
            } catch {
              // Can't parse token, use it anyway
            }
            return parsed.accessToken;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }
    return null;
  }, []);

  return useMemo(() => ({
    isLoading,
    user,
    getAccessToken,
  }), [isLoading, user, getAccessToken]);
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]:', event.reason);
  // Prevent default browser behavior (console error)
  event.preventDefault();
});

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('[Uncaught Error]:', event.error);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConvexProviderWithAuthKit client={convex} useAuth={useLocalStorageAuth}>
        <WorkOSAuthProvider>
          <App />
        </WorkOSAuthProvider>
      </ConvexProviderWithAuthKit>
    </BrowserRouter>
  </StrictMode>,
);
