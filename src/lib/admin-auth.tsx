import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ---------------------------------------------------------------------------
// Admin Auth Context (WorkOS AuthKit)
// ---------------------------------------------------------------------------
// Manages admin authentication state separate from Convex Auth (providers)
// Tokens are stored in localStorage for persistence
// ---------------------------------------------------------------------------

interface AdminUser {
  userId: string;
  accessToken: string;
  refreshToken?: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  loginAsAdmin: (params: { accessToken: string; refreshToken?: string; userId: string }) => void;
  logoutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const STORAGE_KEY = "workos_admin_auth";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AdminUser;
        setAdminUser(parsed);
      }
    } catch (err) {
      console.error("Failed to load admin auth from storage:", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsAdmin = useCallback(
    ({ accessToken, refreshToken, userId }: { accessToken: string; refreshToken?: string; userId: string }) => {
      const user: AdminUser = { userId, accessToken, refreshToken };
      setAdminUser(user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    },
    []
  );

  const logoutAdmin = useCallback(() => {
    setAdminUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated: !!adminUser,
        isLoading,
        loginAsAdmin,
        logoutAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
