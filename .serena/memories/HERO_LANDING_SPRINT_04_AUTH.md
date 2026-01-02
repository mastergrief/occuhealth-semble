# Auth Component Refactor
**Sprint**: 04 of 06
**Index**: HERO_LANDING_INDEX
**Depends On**: HERO_LANDING_SPRINT_03_SECTIONS
**Next**: HERO_LANDING_SPRINT_05_INTEGRATION

---

## Objective
Extract authentication components from App.tsx into dedicated modules with improved UX.

---

## 1. SignInForm Component

**File**: `src/components/auth/SignInForm.tsx`

```tsx
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
      // User-friendly error mapping
      const friendlyErrors: Record<string, string> = {
        "Invalid email or password": "The email or password you entered is incorrect.",
        "User not found": "No account found with this email.",
        "User already exists": "An account with this email already exists.",
      }
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
          placeholder="••••••••" 
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
```

---

## 2. SignOutButton Component

**File**: `src/components/auth/SignOutButton.tsx`

```tsx
import { useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface SignOutButtonProps {
  variant?: "default" | "ghost" | "outline"
  showIcon?: boolean
}

export function SignOutButton({ variant = "ghost", showIcon = true }: SignOutButtonProps) {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()
  
  if (!isAuthenticated) return null
  
  return (
    <Button 
      variant={variant} 
      onClick={() => void signOut()}
      className="gap-2"
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  )
}
```

---

## 3. AuthModal Component

**File**: `src/components/auth/AuthModal.tsx`

```tsx
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
  title = "Welcome Back",
  initialFlow = "signIn" 
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
```

---

## 4. Create Index Export

**File**: `src/components/auth/index.ts`

```typescript
export { SignInForm } from "./SignInForm"
export { SignOutButton } from "./SignOutButton"
export { AuthModal } from "./AuthModal"
```

---

## 5. Key Improvements Over Original

| Aspect | Original (App.tsx) | Refactored |
|--------|-------------------|------------|
| **Loading State** | None | Spinner + disabled inputs |
| **Error Messages** | Raw backend errors | User-friendly mapping |
| **Error Clearing** | Manual | Auto-clear on input change |
| **Form Validation** | HTML5 only | minLength + required |
| **Focus Rings** | None | medical-blue ring |
| **Accessibility** | No labels | Proper Label components |
| **Reusability** | Inline function | Exportable component |
| **Modal Support** | None | AuthModal wrapper |

---

## Acceptance Criteria

- [ ] SignInForm has loading spinner during submission
- [ ] SignInForm shows user-friendly error messages
- [ ] SignInForm clears errors on input change
- [ ] SignOutButton only renders when authenticated
- [ ] AuthModal can wrap any trigger element
- [ ] All components use medical-blue theme
- [ ] `npm run typecheck` passes

---

## Evidence Verification

```bash
# Check files created
ls src/components/auth/

# Verify loading state
grep "isLoading" src/components/auth/SignInForm.tsx

# Check error mapping
grep "friendlyErrors" src/components/auth/SignInForm.tsx

# Verify Dialog usage
grep "Dialog" src/components/auth/AuthModal.tsx

# Typecheck
npm run typecheck
```

---

→ Next: HERO_LANDING_SPRINT_05_INTEGRATION