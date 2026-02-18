import { NavLink, Navigate, Routes, Route } from "react-router-dom";
import { lazy, Suspense, createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEmployerAuth } from "@/lib/workos-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { Doc } from "../../convex/_generated/dataModel";

// Context for sharing employer data with child routes
export interface EmployerContextType {
  employer: Doc<"employers"> | null | undefined;
  isVerified: boolean;
}

export const EmployerContext = createContext<EmployerContextType>({
  employer: undefined,
  isVerified: false,
});

export const useEmployerContext = () => useContext(EmployerContext);

// Lazy load employer pages
const EmployerDashboard = lazy(() =>
  import("./employer/Dashboard").then(m => ({ default: m.EmployerDashboard }))
);
const EmployeesPage = lazy(() =>
  import("./employer/Employees").then(m => ({ default: m.EmployeesPage }))
);
const BookingsPage = lazy(() =>
  import("./employer/Bookings").then(m => ({ default: m.BookingsPage }))
);
const ReportsPage = lazy(() =>
  import("./employer/Reports").then(m => ({ default: m.ReportsPage }))
);
const EmployerSettings = lazy(() =>
  import("./employer/Settings").then(m => ({ default: m.EmployerSettings }))
);

export function EmployerLayout() {
  const { isAuthenticated, isLoading, workosUserId, logoutEmployer, sessionId } = useEmployerAuth();

  const handleLogout = () => {
    logoutEmployer();
    localStorage.clear();
    sessionStorage.clear();
    if (sessionId) {
      window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}&sessionId=${sessionId}`;
    } else {
      window.location.href = "/";
    }
  };

  // Fetch employer data from Convex using WorkOS user ID
  const employer = useQuery(
    api.employers.getByWorkosIdPublic,
    workosUserId ? { workosUserId } : "skip"
  );

  const isVerified = employer?.status === "verified";

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="relative w-64 bg-white dark:bg-slate-800 border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">OccuFlow</h1>
          <p className="text-sm text-muted-foreground">{employer?.companyName ?? "Loading..."}</p>
        </div>

        <nav className="px-4 space-y-1">
          <NavLink
            to="/employer/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/employer/employees"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`
            }
          >
            <Users className="h-5 w-5" />
            Employees
          </NavLink>
          <NavLink
            to="/employer/bookings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`
            }
          >
            <Calendar className="h-5 w-5" />
            Bookings
          </NavLink>
          <NavLink
            to="/employer/reports"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`
            }
          >
            <FileText className="h-5 w-5" />
            Reports
          </NavLink>
          <NavLink
            to="/employer/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
              }`
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Pending verification banner */}
        {!isVerified && employer && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Account Pending Verification</p>
              <p className="text-sm text-amber-600">
                Some features are restricted until your account is verified.
              </p>
            </div>
          </div>
        )}

        <div className="p-6">
          <EmployerContext.Provider value={{ employer, isVerified }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
              <Routes>
                <Route path="dashboard" element={<EmployerDashboard />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<EmployerSettings />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Routes>
            </Suspense>
          </EmployerContext.Provider>
        </div>
      </main>
    </div>
  );
}
