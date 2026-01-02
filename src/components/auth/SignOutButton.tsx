import { useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface SignOutButtonProps {
  showIcon?: boolean
  variant?: "ghost" | "outline" | "destructive"
  className?: string
}

export function SignOutButton({
  showIcon = true,
  variant = "ghost",
  className,
}: SignOutButtonProps) {
  const { isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()

  if (!isAuthenticated) return null

  return (
    <Button
      variant={variant}
      onClick={() => void signOut()}
      className={className}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  )
}
