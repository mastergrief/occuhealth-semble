import { useWorkOSAuth } from "@/lib/workos-auth"
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
  const { isAuthenticated, logout } = useWorkOSAuth()

  if (!isAuthenticated) return null

  return (
    <Button
      variant={variant}
      onClick={logout}
      className={className}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  )
}
