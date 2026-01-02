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
