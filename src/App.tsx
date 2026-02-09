"use client";

import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Layout components
import { NavigationBar, Footer } from "@/components/layout";

// Error handling
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Landing page sections
import { HeroSection, FeaturesSection, HowItWorksSection, PricingSection, TestimonialsSection, CTASection } from "@/components/landing";

// Auth components
import { SignOutButton, AdminAuthCallback } from "@/components/auth";

// Auth - unified WorkOS provider
import { useWorkOSAuth, EmployerAuthProvider, DoctorAuthProvider } from "@/lib/workos-auth";

import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

// =============================================================================
// Lazy-loaded route components for code splitting
// =============================================================================

// Lazy load layouts
const EmployerLayout = lazy(() =>
  import("./pages/EmployerLayout").then(m => ({ default: m.EmployerLayout }))
);
const DoctorLayout = lazy(() =>
  import("./pages/DoctorLayout").then(m => ({ default: m.DoctorLayout }))
);
const AdminLayout = lazy(() =>
  import("./pages/AdminLayout").then(m => ({ default: m.AdminLayout }))
);

// Lazy load registration pages
const ChooseRole = lazy(() =>
  import("./pages/register/ChooseRole").then(m => ({ default: m.ChooseRole }))
);
const EmployerRegistrationForm = lazy(() =>
  import("./components/employer/EmployerRegistrationForm").then(m => ({ default: m.EmployerRegistrationForm }))
);
const DoctorRegistrationForm = lazy(() =>
  import("./components/doctor/DoctorRegistrationForm").then(m => ({ default: m.DoctorRegistrationForm }))
);

// Lazy load patient pages
const ViewAppointment = lazy(() => import("./pages/patient/ViewAppointment"));

// =============================================================================
// Loading fallback component
// =============================================================================

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// =============================================================================
// Main App Component
// =============================================================================

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Auth callback */}
      <Route path="/auth/callback" element={<AdminAuthCallback />} />

      {/* Registration routes */}
      <Route path="/register/choose-role" element={
        <Suspense fallback={<PageLoader />}>
          <ChooseRole />
        </Suspense>
      } />
      <Route path="/register/employer" element={
        <Suspense fallback={<PageLoader />}>
          <EmployerRegistrationForm />
        </Suspense>
      } />
      <Route path="/register/doctor" element={
        <Suspense fallback={<PageLoader />}>
          <DoctorRegistrationForm />
        </Suspense>
      } />

      {/* Employer portal routes - auth provider outside Suspense */}
      <Route path="/employer/*" element={
        <EmployerAuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <EmployerLayout />
            </Suspense>
          </ErrorBoundary>
        </EmployerAuthProvider>
      } />

      {/* Doctor portal routes - auth provider outside Suspense */}
      <Route path="/doctor/*" element={
        <DoctorAuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <DoctorLayout />
            </Suspense>
          </ErrorBoundary>
        </DoctorAuthProvider>
      } />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AdminLayout />
          </Suspense>
        </ErrorBoundary>
      } />

      {/* Patient public routes (no auth required) */}
      <Route
        path="/view-appointment/:token"
        element={
          <Suspense fallback={<PageLoader />}>
            <ViewAppointment />
          </Suspense>
        }
      />

      {/* Main app routes */}
      <Route path="/*" element={<MainLayout />} />
      </Routes>
    </>
  );
}

// =============================================================================
// Main app layout (providers/patients) - NOT lazy loaded (landing page)
// =============================================================================

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

// =============================================================================
// Authenticated Navigation
// =============================================================================

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

// =============================================================================
// Landing Page (Unauthenticated) - NOT lazy loaded
// =============================================================================

function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />

      {/* Floating Provider Login button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="medical"
          size="lg"
          className="shadow-lg"
          onClick={() => {
            window.location.href = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/login?returnTo=${encodeURIComponent(window.location.origin)}`;
          }}
        >
          Provider Login
        </Button>
      </div>
    </>
  );
}

// =============================================================================
// Dashboard (Authenticated)
// =============================================================================

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
