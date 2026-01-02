import { useState } from "react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface SignInFormProps {
  onSuccess?: () => void
  initialFlow?: "signIn" | "signUp"
}

const friendlyErrors: Record<string, string> = {
  "Invalid credentials": "The email or password you entered is incorrect. Please try again.",
  "Invalid email or password": "The email or password you entered is incorrect. Please try again.",
  "User not found": "No account found with this email. Please sign up first.",
  "Email already exists": "An account with this email already exists. Please sign in.",
  "User already exists": "An account with this email already exists. Please sign in.",
}

export function SignInForm({ onSuccess, initialFlow = "signIn" }: SignInFormProps) {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">(initialFlow)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set("flow", flow)

    try {
      await signIn("password", formData)
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed"
      setError(friendlyErrors[message] || message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          disabled={isLoading}
          onChange={() => setError(null)}
          className="focus-visible:ring-medical-blue"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="********"
          required
          minLength={8}
          disabled={isLoading}
          onChange={() => setError(null)}
          className="focus-visible:ring-medical-blue"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="medical"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {flow === "signIn" ? "Signing in..." : "Creating account..."}
          </>
        ) : (
          flow === "signIn" ? "Sign In" : "Create Account"
        )}
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        {flow === "signIn" ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setFlow(f => f === "signIn" ? "signUp" : "signIn")
            setError(null)
          }}
          className="text-medical-blue hover:underline font-medium"
          disabled={isLoading}
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </form>
  )
}
