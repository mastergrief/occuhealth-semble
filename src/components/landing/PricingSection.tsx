import { Container } from "@/components/layout/Container"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarCheck, Package, Handshake } from "lucide-react"

const pricingTiers = [
  {
    icon: CalendarCheck,
    title: "One-off Assessments",
    price: "£350",
    description: "Individual pre-employment or health surveillance assessments. Ideal for occasional hiring or specific compliance requirements.",
    features: [
      "Pre-employment health screenings",
      "Single health surveillance checks",
      "24-hour report turnaround",
      "Secure digital delivery",
    ],
  },
  {
    icon: Package,
    title: "Subscription Packages",
    price: "Contact for pricing",
    description: "Monthly or annual packages for regular assessment needs. Best for growing businesses with ongoing hiring.",
    features: [
      "Discounted per-assessment rates",
      "Priority booking slots",
      "Dedicated account support",
      "Employer portal access",
    ],
  },
  {
    icon: Handshake,
    title: "Custom Retainer",
    price: "Contact for pricing",
    description: "Tailored occupational health partnership for enterprise clients. Full-service solution for large organisations.",
    features: [
      "Unlimited assessments",
      "On-site clinic options",
      "Custom reporting integration",
      "Compliance consultancy",
    ],
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Flexible options to match your business needs. Contact us for a tailored quote.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pricingTiers.map(({ icon: Icon, title, price, description, features }) => (
            <Card key={title} className="hover:shadow-lg transition-shadow border-0 shadow-sm flex flex-col">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-medical-blue/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-medical-blue" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="text-base">{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-2xl font-semibold text-medical-blue mb-4">{price}</p>
                <ul className="space-y-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-medical-blue mt-0.5">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">
                  Get in Touch
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
