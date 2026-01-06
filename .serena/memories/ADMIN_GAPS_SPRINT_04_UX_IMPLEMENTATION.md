# Feature Implementation - UX Gaps

**Sprint**: 04 of 06
**Index**: ADMIN_GAPS_INDEX
**Depends On**: ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: ADMIN_GAPS_SPRINT_05_MANUAL_TESTING

---

## Feature 1: Dark Mode Toggle

### 1.1 Infrastructure Status: ✅ READY

CSS variables are 100% complete in `src/index.css`:
- Lines 51-91: Light mode `:root` variables
- Lines 93-129: Dark mode `.dark` selector variables
- All colors use OKLCH color space

### 1.2 Create Theme Hook

**New File**: `src/hooks/useTheme.ts`

```typescript
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      if (t === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.toggle("dark", systemTheme === "dark");
      } else {
        root.classList.toggle("dark", t === "dark");
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return { theme, setTheme };
}
```

### 1.3 Create Theme Toggle Component

**New File**: `src/components/ThemeToggle.tsx`

```typescript
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 1.4 Integration

**File**: `src/pages/AdminLayout.tsx` (header section)

```typescript
import { ThemeToggle } from "@/components/ThemeToggle";

// In header nav, before Sign Out button:
<ThemeToggle />
<Button variant="outline" size="sm" onClick={handleLogout}>
  Sign Out
</Button>
```

---

## Feature 2: Mobile Hamburger Menu

### 2.1 Current Problem

AdminLayout header nav always visible:
- On 320px mobile: Text overflows, buttons cramped
- No responsive collapse
- Touch targets too small (32px vs 44px WCAG standard)

### 2.2 Implementation Using Sheet Component

**File**: `src/pages/AdminLayout.tsx`

**Add Imports:**
```typescript
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
```

**Add State:**
```typescript
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

**Replace Header Nav (lines 113-128):**
```tsx
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
  <div className="container mx-auto px-4 flex h-16 items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-4">
      <a href="/" className="font-semibold text-xl">OccuHealth</a>
      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Admin</span>
    </div>
    
    {/* Desktop Navigation - Hidden on mobile */}
    <nav className="hidden md:flex items-center gap-4">
      <a href="/admin" className="text-sm hover:text-primary">Dashboard</a>
      <a href="/admin/employers" className="text-sm hover:text-primary">Employers</a>
      <a href="/admin/gdpr" className="text-sm hover:text-primary">GDPR</a>
      <a href="/admin/appointment-types" className="text-sm hover:text-primary">Appointment Types</a>
      <ThemeToggle />
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Sign Out
      </Button>
    </nav>
    
    {/* Mobile Hamburger Menu */}
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
              className="text-lg py-3 px-2 hover:bg-accent rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </a>
            <a 
              href="/admin/employers" 
              className="text-lg py-3 px-2 hover:bg-accent rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              Employers
            </a>
            <a 
              href="/admin/gdpr" 
              className="text-lg py-3 px-2 hover:bg-accent rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              GDPR
            </a>
            <a 
              href="/admin/appointment-types" 
              className="text-lg py-3 px-2 hover:bg-accent rounded-md"
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
```

### 2.3 Touch Target Improvements

**Minimum 44px touch targets:**
- Mobile menu button: `h-11 w-11` (44px)
- Mobile nav links: `py-3 px-2` with full-width hit area
- Sign out button: `h-11` (44px height)

---

## Feature 3: Audit Log Filter UI

**File**: `src/pages/admin/AuditLogs.tsx` (expand from 41 lines)

```typescript
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

const ACTION_TYPES = [
  "patient_created", "appointment_booked", "appointment_completed",
  "report_created", "report_sent_to_employer", "report_viewed",
  "consent_created", "consent_withdrawn", "employer_verified",
  "employer_rejected", "erasure_requested", "erasure_processed",
];

const ACTOR_TYPES = ["employer", "doctor", "admin", "system"];
const RESOURCE_TYPES = ["patient", "appointment", "report", "consent", "employer"];

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    action: "",
    actorType: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });

  const logs = useQuery(api.gdpr.getAuditLogs, {
    limit: 100,
    action: filters.action || undefined,
    actorType: filters.actorType || undefined,
    resourceType: filters.resourceType || undefined,
    startTime: filters.startDate ? new Date(filters.startDate).getTime() : undefined,
    endTime: filters.endDate ? new Date(filters.endDate + "T23:59:59").getTime() : undefined,
  });

  const clearFilters = () => {
    setFilters({ action: "", actorType: "", resourceType: "", startDate: "", endDate: "" });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      
      {/* Filter Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filters.action} onValueChange={(v) => setFilters(f => ({...f, action: v}))}>
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actor Type</Label>
              <Select value={filters.actorType} onValueChange={(v) => setFilters(f => ({...f, actorType: v}))}>
                <SelectTrigger><SelectValue placeholder="All actors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {ACTOR_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={filters.resourceType} onValueChange={(v) => setFilters(f => ({...f, resourceType: v}))}>
                <SelectTrigger><SelectValue placeholder="All resources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {RESOURCE_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(f => ({...f, startDate: e.target.value}))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(f => ({...f, endDate: e.target.value}))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Results {logs && `(${logs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Existing log display code */}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Acceptance Criteria

### Dark Mode Toggle
- [ ] Theme hook persists preference to localStorage
- [ ] Toggle appears in admin header
- [ ] Light/Dark/System options available
- [ ] CSS variables switch correctly

### Mobile Hamburger Menu
- [ ] Hamburger icon visible on mobile (< 768px)
- [ ] Desktop nav hidden on mobile
- [ ] Sheet slides in from right
- [ ] Touch targets minimum 44px
- [ ] Menu closes after navigation

### Audit Log Filters
- [ ] Action type dropdown filters logs
- [ ] Actor type dropdown filters logs
- [ ] Resource type dropdown filters logs
- [ ] Date range filters logs
- [ ] Clear button resets all filters

---

→ Next: ADMIN_GAPS_SPRINT_05_MANUAL_TESTING
