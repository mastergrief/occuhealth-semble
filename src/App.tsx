"use client";

import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Layout components
import { NavigationBar, Footer } from "@/components/layout";

// Landing page sections
import { HeroSection, FeaturesSection, TestimonialsSection, CTASection } from "@/components/landing";

// Auth components
import { AuthModal, SignOutButton } from "@/components/auth";

import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - conditional based on auth state */}
      <Unauthenticated>
        <NavigationBar />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedNav />
      </Authenticated>

      {/* Main Content */}
      <main className="flex-1">
        <Unauthenticated>
          <LandingPage />
        </Unauthenticated>
        <Authenticated>
          <Dashboard />
        </Authenticated>
      </main>

      {/* Footer - always visible */}
      <Footer />
    </div>
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
        <AuthModal
          trigger={
            <Button variant="medical" size="lg" className="shadow-lg">
              Provider Login
            </Button>
          }
          title="Provider Login"
        />
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
