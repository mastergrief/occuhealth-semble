"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Layout components
import { NavigationBar, Footer } from "@/components/layout";

// Landing page sections
import { HeroSection, FeaturesSection, TestimonialsSection, CTASection } from "@/components/landing";

// Auth components
import { SignOutButton, AdminAuthCallback } from "@/components/auth";

// Auth - unified WorkOS provider
import { useAdminAuth, useWorkOSAuth, EmployerAuthProvider, DoctorAuthProvider } from "@/lib/workos-auth";

// Registration pages
import { ChooseRole } from "@/pages/register/ChooseRole";
import { EmployerRegistrationForm } from "@/components/employer/EmployerRegistrationForm";

// Employer Portal
import { EmployerLayout } from "@/pages/EmployerLayout";
import { EmployerDashboard } from "@/pages/employer/Dashboard";
import { EmployeesPage } from "@/pages/employer/Employees";
import { BookingsPage } from "@/pages/employer/Bookings";
import { ReportsPage } from "@/pages/employer/Reports";
import { EmployerSettings } from "@/pages/employer/Settings";

// Doctor Portal
import { DoctorLayout } from "@/pages/DoctorLayout";
import { DoctorDashboard } from "@/pages/doctor/Dashboard";
import { DoctorAppointments } from "@/pages/doctor/Appointments";
import { DoctorSchedule } from "@/pages/doctor/Schedule";
import { DoctorReports } from "@/pages/doctor/Reports";
import { DoctorSettings } from "@/pages/doctor/Settings";

// Admin GDPR pages
import { EmployerVerification } from "@/pages/admin/EmployerVerification";
import { GDPRDashboard } from "@/pages/admin/GDPRDashboard";
import { ErasureRequests } from "@/pages/admin/ErasureRequests";
import { AuditLogs } from "@/pages/admin/AuditLogs";

import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <Routes>
      {/* Auth callback */}
      <Route path="/auth/callback" element={<AdminAuthCallback />} />

      {/* Registration routes */}
      <Route path="/register/choose-role" element={<ChooseRole />} />
      <Route path="/register/employer" element={<EmployerRegistrationForm />} />

      {/* Employer portal routes */}
      <Route path="/employer" element={<EmployerAuthProvider><EmployerLayout /></EmployerAuthProvider>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EmployerDashboard />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<EmployerSettings />} />
      </Route>

      {/* Doctor portal routes */}
      <Route path="/doctor" element={<DoctorAuthProvider><DoctorLayout /></DoctorAuthProvider>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="reports" element={<DoctorReports />} />
        <Route path="settings" element={<DoctorSettings />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/*" element={<AdminLayout />} />

      {/* Main app routes */}
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
}

// Main app layout (providers/patients)
function MainLayout() {
  const { isAuthenticated, isLoading } = useWorkOSAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - conditional based on auth state */}
      {isAuthenticated ? <AuthenticatedNav /> : <NavigationBar />}

      {/* Main Content */}
      <main className="flex-1">
        {isAuthenticated ? <Dashboard /> : <LandingPage />}
      </main>

      {/* Footer - always visible */}
      <Footer />
    </div>
  );
}

// Admin layout (WorkOS authenticated)
function AdminLayout() {
  const { isAdminAuthenticated, isLoading, adminUser, logoutAdmin } = useAdminAuth();

  const handleLogout = () => {
    logoutAdmin();
    // Redirect to home after clearing local tokens
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in with your admin credentials.</p>
          <a
            href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in as Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-semibold text-xl">OccuHealth</a>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Admin</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/admin" className="text-sm hover:text-primary">Dashboard</a>
            <a href="/admin/employers" className="text-sm hover:text-primary">Employers</a>
            <a href="/admin/gdpr" className="text-sm hover:text-primary">GDPR</a>
          </nav>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route index element={<AdminDashboardContent adminUser={adminUser} />} />
          <Route path="employers" element={<EmployerVerification />} />
          <Route path="gdpr" element={<GDPRDashboard />} />
          <Route path="gdpr/erasure" element={<ErasureRequests />} />
          <Route path="gdpr/audit" element={<AuditLogs />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

// Admin Dashboard Content (extracted for routing)
function AdminDashboardContent({ adminUser }: { adminUser: { userId: string } | null }) {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome, {adminUser?.userId}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a href="/admin/employers" className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
          <h2 className="font-semibold mb-2">Employer Verification</h2>
          <p className="text-sm text-muted-foreground">Review and approve employer registrations</p>
        </a>
        <a href="/admin/gdpr" className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
          <h2 className="font-semibold mb-2">GDPR Compliance</h2>
          <p className="text-sm text-muted-foreground">Manage data protection and privacy</p>
        </a>
        <a href="/admin/gdpr/audit" className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
          <h2 className="font-semibold mb-2">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">View system activity and compliance logs</p>
        </a>
      </div>
    </>
  );
}

// Authenticated Navigation
function AuthenticatedNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <a href="/" className="font-semibold text-xl">OccuHealth</a>
        <SignOutButton />
      </div>
    </header>
  );
}

// Landing Page (Unauthenticated)
function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <CTASection />

      {/* Floating Provider Login button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="medical"
          size="lg"
          className="shadow-lg"
          onClick={() => {
            window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login`;
          }}
        >
          Provider Login
        </Button>
      </div>
    </>
  );
}

// Dashboard (Authenticated)
function Dashboard() {
  const { viewer, numbers } =
    useQuery(api.myFunctions.listNumbers, { count: 10 }) ?? {};
  const addNumber = useMutation(api.myFunctions.addNumber);

  if (viewer === undefined || numbers === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to OccuHealth</h1>
        <p className="text-muted-foreground">Logged in as {viewer}</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 mb-8">
        <h2 className="font-semibold mb-4">Quick Stats (Demo)</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="medical"
            onClick={() => void addNumber({ value: Math.floor(Math.random() * 100) })}
          >
            Add Random Number
          </Button>
          <span className="text-muted-foreground">
            {numbers.length} numbers stored
          </span>
        </div>
        {numbers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {numbers.map((n, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-medical-blue/10 text-medical-blue rounded-full text-sm"
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-6">
        <h2 className="font-semibold mb-4">Your Occupational Health Dashboard</h2>
        <p className="text-muted-foreground">
          This is where your patient data, medical reports, and compliance tracking will appear.
          The full dashboard functionality is coming soon.
        </p>
      </div>
    </div>
  );
}
