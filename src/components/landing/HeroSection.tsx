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
                  <span className="text-medical-blue font-semibold">Fit for Duty</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
