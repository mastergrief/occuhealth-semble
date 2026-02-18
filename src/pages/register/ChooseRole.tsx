import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Stethoscope, LogOut } from "lucide-react";

export function ChooseRole() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userId = searchParams.get("userId");
  const sessionId = searchParams.get("sessionId");

  // Validate required tokens are present
  const tokensValid = accessToken && userId;

  const handleSelectRole = (role: "employer" | "doctor") => {
    // Pass tokens to registration form including sessionId
    const params = new URLSearchParams({
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      userId: userId || "",
      sessionId: sessionId || "",
    });
    navigate(`/register/${role}?${params.toString()}`);
  };

  // Show error if tokens are missing
  if (!tokensValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Authentication Error</CardTitle>
            <CardDescription>
              Missing authentication tokens. Please try signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-medical-blue">Welcome to OccuFlow</h1>
          <p className="text-muted-foreground">Select how you'd like to use the platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-medical-blue transition-colors"
            onClick={() => handleSelectRole("employer")}
          >
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto text-medical-blue" />
              <CardTitle>Employer / Insurer</CardTitle>
              <CardDescription>
                Book occupational health assessments for your employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Register employees</li>
                <li>Book appointments</li>
                <li>View fitness reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-medical-blue transition-colors"
            onClick={() => handleSelectRole("doctor")}
          >
            <CardHeader className="text-center">
              <Stethoscope className="h-12 w-12 mx-auto text-medical-blue" />
              <CardTitle>Medical Provider</CardTitle>
              <CardDescription>
                Conduct assessments and submit medical reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Manage schedule</li>
                <li>Conduct appointments</li>
                <li>Submit reports</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-2">
          <Button variant="link" onClick={() => navigate("/")}>
            Back to Home
          </Button>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                // Clear any local storage and redirect to WorkOS logout
                localStorage.clear();
                const logoutUrl = `${import.meta.env.VITE_CONVEX_URL?.replace('.cloud', '.site')}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}${sessionId ? `&sessionId=${sessionId}` : ''}`;
                window.location.href = logoutUrl;
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out / Use different account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
