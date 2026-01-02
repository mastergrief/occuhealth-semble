import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SignInForm } from "./SignInForm"
import { Stethoscope } from "lucide-react"

interface AuthModalProps {
  trigger: React.ReactNode
  title?: string
  initialFlow?: "signIn" | "signUp"
}

export function AuthModal({
  trigger,
  title = "Welcome to OccuHealth",
  initialFlow = "signIn",
}: AuthModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="h-12 w-12 rounded-full bg-medical-blue/10 flex items-center justify-center mb-2">
            <Stethoscope className="h-6 w-6 text-medical-blue" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <SignInForm
          onSuccess={() => setOpen(false)}
          initialFlow={initialFlow}
        />
      </DialogContent>
    </Dialog>
  )
}
