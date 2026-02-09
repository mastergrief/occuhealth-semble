import { NavLink, Navigate, Routes, Route } from "react-router-dom";
import { lazy, Suspense, createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useDoctorAuth } from "@/lib/workos-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, Clock, FileText, Settings, LogOut } from "lucide-react";
import { Doc } from "../../convex/_generated/dataModel";

// Context for sharing doctor data with child routes
export const DoctorContext = createContext<{ doctor: Doc<"doctorSettings"> | null | undefined }>({ doctor: undefined });
export const useDoctorContext = () => useContext(DoctorContext);

// Lazy load doctor pages
const DoctorDashboard = lazy(() =>
  import("./doctor/Dashboard").then(m => ({ default: m.DoctorDashboard }))
);
const DoctorAppointments = lazy(() =>
  import("./doctor/Appointments").then(m => ({ default: m.DoctorAppointments }))
);
const DoctorSchedule = lazy(() =>
  import("./doctor/Schedule").then(m => ({ default: m.DoctorSchedule }))
);
const DoctorReports = lazy(() =>
  import("./doctor/Reports").then(m => ({ default: m.DoctorReports }))
);
const DoctorSettings = lazy(() =>
  import("./doctor/Settings").then(m => ({ default: m.DoctorSettings }))
);

/**
 * DoctorLayout - Main layout component for the Doctor Portal
 *
 * Provides authentication guard, sidebar navigation, and shared context
 * for all doctor portal pages.
 *
 * @component
 * @requires useDoctorAuth - Authentication hook from workos-auth
 *
 * ## Features
 * - Authentication guard with redirect to landing
 * - Lazy-loaded child page routes
 * - DoctorContext provider for shared state
 * - Responsive sidebar navigation
 *
 * ## Routes
 * - /doctor/dashboard - Today's schedule
 * - /doctor/appointments - Browse by date
 * - /doctor/schedule - Manage availability
 * - /doctor/reports - Create fitness reports
 * - /doctor/settings - Profile management
 *
 * @see DoctorContextType - Context interface
 * @see useDoctorContext - Context consumer hook
 */

export function DoctorLayout() {
  const { isAuthenticated, isLoading, workosUserId, logoutDoctor, sessionId } = useDoctorAuth();

  const handleLogout = () => {
    logoutDoctor();
    localStorage.clear();
    sessionStorage.clear();
    if (sessionId) {
      window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}&sessionId=${sessionId}`;
    } else {
      window.location.href = "/";
    }
  };

  // Fetch doctor data from Convex using WorkOS user ID
  const doctor = useQuery(
    api.doctorSettings.getByWorkosUserId,
    workosUserId ? { workosUserId } : "skip"
  );

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="relative w-64 bg-white dark:bg-slate-800 border-r">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">OccuHealth</h1>
          <p className="text-sm text-muted-foreground">Dr. {doctor?.name ?? "Loading..."}</p>
        </div>

        <nav className="px-4 space-y-1">
          <NavLink to="/doctor/dashboard" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`
          }>
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>
          <NavLink to="/doctor/appointments" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`
          }>
            <Calendar className="h-5 w-5" />
            Appointments
          </NavLink>
          <NavLink to="/doctor/schedule" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`
          }>
            <Clock className="h-5 w-5" />
            Schedule
          </NavLink>
          <NavLink to="/doctor/reports" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`
          }>
            <FileText className="h-5 w-5" />
            Reports
          </NavLink>
          <NavLink to="/doctor/settings" className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700"
            }`
          }>
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

      <main className="flex-1 p-6">
        <DoctorContext.Provider value={{ doctor }}>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <Routes>
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="schedule" element={<DoctorSchedule />} />
              <Route path="reports" element={<DoctorReports />} />
              <Route path="settings" element={<DoctorSettings />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </Suspense>
        </DoctorContext.Provider>
      </main>
    </div>
  );
}
