# Layout Components
**Sprint**: 02 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: HERO_LANDING_SPRINT_01_FOUNDATION
**Next**: HERO_LANDING_SPRINT_03_SECTIONS

---

## Objective
Create reusable layout components: NavigationBar, Footer, and Container.

---

## 1. Container Component

**File**: `src/components/layout/Container.tsx`

```tsx
import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div 
      className={cn("container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl", className)} 
      {...props}
    >
      {children}
    </div>
  )
}
```

---

## 2. NavigationBar Component

**File**: `src/components/layout/NavigationBar.tsx`

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Stethoscope } from "lucide-react"
import { Container } from "./Container"

interface NavigationBarProps {
  onLoginClick?: () => void
  onDemoClick?: () => void
}

export function NavigationBar({ onLoginClick, onDemoClick }: NavigationBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
  ]
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-medical-blue" />
            <span className="font-semibold text-xl">MedReport Pro</span>
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          
          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" onClick={onLoginClick}>
              Login
            </Button>
            <Button variant="medical" onClick={onDemoClick}>
              Request Demo
            </Button>
          </div>
          
          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map(link => (
                  <a 
                    key={link.href}
                    href={link.href} 
                    className="text-lg font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" onClick={onLoginClick}>Login</Button>
                  <Button variant="medical" onClick={onDemoClick}>Request Demo</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </Container>
    </header>
  )
}
```

---

## 3. Footer Component

**File**: `src/components/layout/Footer.tsx`

```tsx
import { Container } from "./Container"
import { Stethoscope, Shield, Lock } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t">
      <Container>
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-6 w-6 text-medical-blue" />
                <span className="font-semibold">MedReport Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional occupational health reports delivered fast and secure.
              </p>
            </div>
            
            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Pre-Employment</a></li>
                <li><a href="#" className="hover:text-foreground">Health Surveillance</a></li>
                <li><a href="#" className="hover:text-foreground">Fitness Assessments</a></li>
                <li><a href="#" className="hover:text-foreground">Drug & Alcohol Testing</a></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About Us</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
                <li><a href="#" className="hover:text-foreground">Careers</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
              </ul>
            </div>
            
            {/* Compliance */}
            <div>
              <h4 className="font-semibold mb-4">Compliance</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Shield className="h-4 w-4 text-trust-green" />
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 text-trust-green" />
                <span>256-bit SSL Encryption</span>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} MedReport Pro. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Cookie Policy</a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
```

---

## 4. Create Index Export

**File**: `src/components/layout/index.ts`

```typescript
export { Container } from "./Container"
export { NavigationBar } from "./NavigationBar"
export { Footer } from "./Footer"
```

---

## Acceptance Criteria

- [ ] Container component provides consistent max-width and padding
- [ ] NavigationBar has responsive mobile menu (Sheet)
- [ ] NavigationBar shows medical blue branding (Stethoscope icon)
- [ ] Footer has 4-column grid layout with compliance badges
- [ ] All components use medical theme colors
- [ ] `npm run typecheck` passes

---

## Evidence Verification

```bash
# Check files created
ls src/components/layout/

# Verify imports work
grep -r "from.*layout" src/

# Check lucide icons imported
grep "lucide-react" src/components/layout/*.tsx

# Typecheck
npm run typecheck
```

---

→ Next: HERO_LANDING_SPRINT_03_SECTIONS