"use client";

import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useAdminAuth } from "@/lib/workos-auth";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

// Admin GDPR pages
import { EmployerVerification } from "@/pages/admin/EmployerVerification";
import { GDPRDashboard } from "@/pages/admin/GDPRDashboard";
import { ErasureRequests } from "@/pages/admin/ErasureRequests";
import { AuditLogs } from "@/pages/admin/AuditLogs";
import { AppointmentTypes } from "@/pages/admin/AppointmentTypes";

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
        <a href="/admin/appointment-types" className="bg-card border rounded-lg p-6 hover:border-primary transition-colors">
          <h2 className="font-semibold mb-2">Appointment Types</h2>
          <p className="text-sm text-muted-foreground">Manage appointment type definitions</p>
        </a>
      </div>
    </>
  );
}

// Admin layout (WorkOS authenticated)
export function AdminLayout() {
  const { isAdminAuthenticated, isLoading, adminUser, logoutAdmin, sessionId } = useAdminAuth();

  // IMPORTANT: All hooks must be called before any conditional returns
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verify admin exists in database (defense-in-depth)
  // Uses verifyAdmin which checks ctx.auth internally - no need to pass workosUserId
  const dbAdmin = useQuery(
    api.adminUsers.verifyAdmin,
    isAdminAuthenticated ? {} : "skip"
  );

  const handleLogout = () => {
    logoutAdmin();
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to WorkOS logout endpoint to clear their session
    if (sessionId) {
      window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}&sessionId=${sessionId}`;
    } else {
      window.location.href = "/";
    }
  };

  // Clear potentially forged tokens if DB returned null (must be in useEffect, not render)
  // IMPORTANT: This hook must be BEFORE any early returns to maintain hooks order
  // NOTE: Currently ctx.auth.getUserIdentity() returns null due to WorkOS JWT integration issue
  // See memory: WORKOS_CONVEX_AUTH_INTEGRATION_ISSUE_20260104
  useEffect(() => {
    if (dbAdmin === null && isAdminAuthenticated) {
      logoutAdmin();
      localStorage.removeItem("workos_admin_auth");
    }
  }, [dbAdmin, isAdminAuthenticated, logoutAdmin]);

  // Show loading while checking auth OR verifying admin in DB
  if (isLoading || (isAdminAuthenticated && dbAdmin === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Block access if not authenticated OR not in admin database
  if (!isAdminAuthenticated || dbAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in with your admin credentials.</p>
          <a
            href={`${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login?returnTo=${encodeURIComponent(window.location.origin)}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
          {/* Logo */}
          <div className="flex items-center gap-4">
            <a href="/" className="font-semibold text-xl">OccuFlow</a>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Admin</span>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-4">
            <a href="/admin" className="text-sm hover:text-primary transition-colors">Dashboard</a>
            <a href="/admin/employers" className="text-sm hover:text-primary transition-colors">Employers</a>
            <a href="/admin/gdpr" className="text-sm hover:text-primary transition-colors">GDPR</a>
            <a href="/admin/appointment-types" className="text-sm hover:text-primary transition-colors">Appointment Types</a>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </nav>

          {/* Mobile Menu - Visible on mobile only */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle>Admin Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-8">
                  <a
                    href="/admin"
                    className="text-lg py-3 px-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </a>
                  <a
                    href="/admin/employers"
                    className="text-lg py-3 px-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Employers
                  </a>
                  <a
                    href="/admin/gdpr"
                    className="text-lg py-3 px-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    GDPR
                  </a>
                  <a
                    href="/admin/appointment-types"
                    className="text-lg py-3 px-2 hover:bg-accent rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Appointment Types
                  </a>
                  <hr className="my-4" />
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route index element={<AdminDashboardContent adminUser={adminUser} />} />
          <Route path="employers" element={<EmployerVerification />} />
          <Route path="gdpr" element={<GDPRDashboard />} />
          <Route path="gdpr/erasure" element={<ErasureRequests />} />
          <Route path="gdpr/audit" element={<AuditLogs />} />
          <Route path="appointment-types" element={<AppointmentTypes />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default AdminLayout;
