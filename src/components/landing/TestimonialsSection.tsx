import { Container } from "@/components/layout/Container"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Quote } from "lucide-react"

const testimonials = [
  {
    quote: "OccuFlow reduced our screening time by 60%. The platform is intuitive and the reports are thorough.",
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
            See what our customers have to say about OccuFlow.
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
