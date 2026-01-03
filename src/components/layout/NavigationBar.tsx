import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Stethoscope } from "lucide-react"
import { Container } from "./Container"

const getLoginUrl = () => {
  const baseUrl = import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site');
  return `${baseUrl}/auth/login`;
};

export function NavigationBar() {
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
            <span className="font-semibold text-xl">OccuHealth</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
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
            <Button variant="ghost" asChild>
              <a href={getLoginUrl()}>Login</a>
            </Button>
            <Button variant="medical" asChild>
              <a href={getLoginUrl()}>Request Demo</a>
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
                {navLinks.map((link) => (
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
                  <Button variant="outline" className="w-full" asChild>
                    <a href={getLoginUrl()}>Login</a>
                  </Button>
                  <Button variant="medical" className="w-full" asChild>
                    <a href={getLoginUrl()}>Request Demo</a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </Container>
    </header>
  )
}
