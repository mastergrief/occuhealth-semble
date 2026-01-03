import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "@/lib/workos-auth";

// ---------------------------------------------------------------------------
// Admin Auth Callback
// ---------------------------------------------------------------------------
// Handles the OAuth callback from WorkOS AuthKit
// Extracts tokens from URL params, stores them, and redirects to admin dashboard
// ---------------------------------------------------------------------------

export function AdminAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginAsAdmin } = useAdminAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double-processing (React StrictMode + dependency changes)
    if (processedRef.current) return;

    // Read tokens from URL params
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");
    const redirectPath = searchParams.get("redirectPath");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(errorParam);
      return;
    }

    if (!accessToken || !userId) {
      setError("Missing authentication tokens");
      return;
    }

    // Mark as processed to prevent re-runs
    processedRef.current = true;

    // Store tokens (including sessionId for proper logout)
    loginAsAdmin({
      accessToken,
      refreshToken: refreshToken || undefined,
      userId,
      sessionId: sessionId || undefined,
    });

    // Redirect to appropriate path or admin dashboard
    navigate(redirectPath || "/admin", { replace: true });
  }, [searchParams, loginAsAdmin, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-md">
          <h1 className="text-lg font-semibold text-destructive mb-2">Authentication Failed</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
