import { Container } from "@/components/layout/Container"
import { UserPlus, CalendarCheck, FileSearch, Video, FileText, Send } from "lucide-react"

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Account",
    description: "Employer creates account and adds employees to the system.",
  },
  {
    number: 2,
    icon: CalendarCheck,
    title: "Book Appointment",
    description: "Select from doctor's available slots for health assessments.",
  },
  {
    number: 3,
    icon: FileSearch,
    title: "Information Review",
    description: "Doctor reviews submitted employee health information.",
  },
  {
    number: 4,
    icon: Video,
    title: "Video Consultation",
    description: "Secure video assessment with occupational health doctor.",
  },
  {
    number: 5,
    icon: FileText,
    title: "Report Compilation",
    description: "Doctor creates comprehensive assessment report.",
  },
  {
    number: 6,
    icon: Send,
    title: "Report Delivery",
    description: "Report sent securely to employer portal for review.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="about" className="py-20 lg:py-28">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Simple, streamlined process from booking to report delivery.
          </p>
        </div>

        <div className="relative">
          {/* Timeline connector line - hidden on mobile */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-medical-blue/20" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="relative flex flex-col items-center text-center">
                {/* Number circle */}
                <div className="relative z-10 mb-4">
                  <div className="h-16 w-16 rounded-full bg-medical-blue flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">{number}</span>
                  </div>
                  {/* Icon badge */}
                  <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-slate-800 border-2 border-medical-blue flex items-center justify-center shadow">
                    <Icon className="h-4 w-4 text-medical-blue" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground max-w-xs">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
