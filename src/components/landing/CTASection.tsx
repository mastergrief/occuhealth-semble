import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

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
            Join UK employers who trust OccuFlow for their
            occupational health and medical assessment needs. Get started in minutes.
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
          </div>
        </div>
      </Container>
    </section>
  )
}
