import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useDoctorAuth } from "@/lib/doctor-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, Clock, FileText, Settings, LogOut } from "lucide-react";

export function DoctorLayout() {
  const { isAuthenticated, isLoading, workosUserId, logoutDoctor } = useDoctorAuth();

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
          <Button variant="ghost" className="w-full justify-start" onClick={logoutDoctor}>
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <Outlet context={{ doctor }} />
      </main>
    </div>
  );
}
