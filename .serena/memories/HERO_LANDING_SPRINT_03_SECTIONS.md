# Landing Page Sections
**Sprint**: 03 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: HERO_LANDING_SPRINT_02_LAYOUT
**Next**: HERO_LANDING_SPRINT_04_AUTH

---

## Objective
Create the main landing page content sections: Hero, Features, Testimonials, and CTA.

---

## 1. HeroSection Component

**File**: `src/components/landing/HeroSection.tsx`

```tsx
import { Button } from "@/components/ui/button"
import { Container } from "@/components/layout/Container"
import { ArrowRight, Play, ClipboardCheck } from "lucide-react"

interface HeroSectionProps {
  onDemoClick?: () => void
}

export function HeroSection({ onDemoClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-medical-blue-light to-background py-20 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Content */}
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-blue/10 text-medical-blue text-sm font-medium w-fit">
              <ClipboardCheck className="h-4 w-4" />
              HIPAA Compliant Platform
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Occupational Health Reports{" "}
              <span className="text-medical-blue">Simplified</span>
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Streamline your medical assessments with our secure, fast, and 
              professional reporting platform. Trusted by 500+ healthcare providers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button size="lg" variant="medical" className="gap-2" onClick={onDemoClick}>
                Request Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-4 w-4" /> Watch Video
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">24h</span>
                <span>Turnaround</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">99.9%</span>
                <span>Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">500+</span>
                <span>Providers</span>
              </div>
            </div>
          </div>
          
          {/* Hero Illustration */}
          <div className="relative lg:pl-8">
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                <div className="h-20 bg-medical-blue-light dark:bg-medical-blue-dark/20 rounded mt-6 flex items-center justify-center">
                  <span className="text-medical-blue font-semibold">✓ Fit for Duty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
```

---

## 2. FeaturesSection Component

**File**: `src/components/landing/FeaturesSection.tsx`

```tsx
import { Container } from "@/components/layout/Container"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Activity, Clock, Shield, Users, FileText } from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Pre-Employment Assessments",
    description: "Comprehensive health screenings for new hires, ensuring workplace safety compliance.",
  },
  {
    icon: Activity,
    title: "Health Surveillance",
    description: "Ongoing monitoring programs tailored to industry-specific requirements.",
  },
  {
    icon: Clock,
    title: "24-Hour Turnaround",
    description: "Fast, reliable report delivery to keep your hiring process moving.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Enterprise-grade security with full regulatory compliance.",
  },
  {
    icon: Users,
    title: "Multi-Provider Network",
    description: "Access to certified occupational health professionals nationwide.",
  },
  {
    icon: FileText,
    title: "Digital Reports",
    description: "Secure online portal for instant access to all medical documentation.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-900/50">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything You Need for Occupational Health
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive solutions for workplace health assessments and compliance.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="hover:shadow-lg transition-shadow border-0 shadow-sm">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-medical-blue/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-medical-blue" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="text-base">{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
```

---

## 3. TestimonialsSection Component

**File**: `src/components/landing/TestimonialsSection.tsx`

```tsx
import { Container } from "@/components/layout/Container"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Quote } from "lucide-react"

const testimonials = [
  {
    quote: "MedReport Pro reduced our screening time by 60%. The platform is intuitive and the reports are thorough.",
    author: "Dr. Sarah Chen",
    role: "Chief Medical Officer",
    company: "TechCorp Industries",
    initials: "SC",
  },
  {
    quote: "Finally, a platform that understands occupational health compliance. Outstanding support team.",
    author: "James Mitchell",
    role: "HR Director",
    company: "BuildRight Construction",
    initials: "JM",
  },
  {
    quote: "The 24-hour turnaround has been a game-changer for our hiring process. Highly recommended.",
    author: "Dr. Emily Rodriguez",
    role: "Occupational Health Lead",
    company: "SafeWork Medical Group",
    initials: "ER",
  },
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-28">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Trusted by Healthcare Professionals
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our customers have to say about MedReport Pro.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="relative">
              <CardContent className="pt-8">
                <Quote className="h-8 w-8 text-medical-blue/20 absolute top-6 left-6" />
                <blockquote className="text-lg mb-6 relative z-10">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-medical-blue text-white">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
```

---

## 4. CTASection Component

**File**: `src/components/landing/CTASection.tsx`

```tsx
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"

interface CTASectionProps {
  onDemoClick?: () => void
}

export function CTASection({ onDemoClick }: CTASectionProps) {
  return (
    <section className="py-20 lg:py-28 bg-medical-blue">
      <Container>
        <div className="text-center max-w-3xl mx-auto text-white">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Transform Your Occupational Health Process?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Join 500+ healthcare providers who trust MedReport Pro for their 
            medical assessment needs. Get started in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="gap-2 bg-white text-medical-blue hover:bg-white/90"
              onClick={onDemoClick}
            >
              Get Started Today <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 border-white text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> Schedule a Call
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
```

---

## 5. Create Index Export

**File**: `src/components/landing/index.ts`

```typescript
export { HeroSection } from "./HeroSection"
export { FeaturesSection } from "./FeaturesSection"
export { TestimonialsSection } from "./TestimonialsSection"
export { CTASection } from "./CTASection"
```

---

## Acceptance Criteria

- [ ] HeroSection has gradient background with medical blue
- [ ] HeroSection displays stats (24h, 99.9%, 500+)
- [ ] FeaturesSection shows 6 feature cards with icons
- [ ] TestimonialsSection displays 3 testimonial cards
- [ ] CTASection has full-width medical blue background
- [ ] All sections use Container for consistent layout
- [ ] `npm run typecheck` passes

---

## Evidence Verification

```bash
# Check files created
ls src/components/landing/

# Verify lucide icons used
grep "lucide-react" src/components/landing/*.tsx

# Check medical-blue class usage
grep "medical-blue" src/components/landing/*.tsx

# Typecheck
npm run typecheck
```

---

→ Next: HERO_LANDING_SPRINT_04_AUTH