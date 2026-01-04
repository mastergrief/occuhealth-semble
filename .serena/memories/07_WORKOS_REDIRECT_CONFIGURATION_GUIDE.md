# WorkOS AuthKit Redirect Configuration Guide

**Version**: 1.0  
**Last Updated**: 2026-01-04  
**Scope**: Project-agnostic reference for WorkOS dashboard redirect settings

---

## Overview

WorkOS AuthKit requires proper redirect URI configuration in the dashboard for authentication flows to work correctly. Misconfigured redirects are the **#1 cause of auth failures** in WorkOS integrations.

**Dashboard Location**: WorkOS Dashboard → Authentication → AuthKit → Redirects

---

## Redirect Types Summary

| Redirect Type | Purpose | Required | When Used |
|---------------|---------|----------|-----------|
| **Redirect URIs** | Post-login destination | ✅ Yes | After successful authentication |
| **Sign-out redirect** | Post-logout destination | ✅ Yes | After logout via `getLogoutUrl()` |
| **App homepage URL** | Branding link in AuthKit UI | Optional | Links in AuthKit pages |
| **Sign-in endpoint** | Custom sign-in initiation | Optional | External sign-in triggers |
| **Sign up URL** | Custom registration page | Optional | "Sign up" links in AuthKit |
| **User invitation URL** | Invitation email landing | Optional | Email invitation links |
| **Password reset URL** | Password reset landing | Optional | Password reset email links |
| **Admin Portal redirects** | Post-action destinations | Optional | Admin Portal operations |

---

## 1. Redirect URIs (CRITICAL)

**Purpose**: Where users land after successful WorkOS authentication.

**Dashboard Path**: Redirects → Redirect URIs → Edit redirect URIs

### Configuration

```
Development:
- http://localhost:3000          (Next.js default)
- http://localhost:5173          (Vite default)
- http://localhost:5174          (Vite alternate)
- http://localhost:5175          (Custom port)
- http://localhost:5176          (Custom port)

Production:
- https://your-domain.com
- https://app.your-domain.com
- https://your-app.convex.site   (Convex hosting)
```

### Best Practices

1. **Add all environments** - Dev, staging, production URLs
2. **Include port variants** - Multiple dev ports for parallel testing
3. **Set default** - Mark production URL as default
4. **No trailing slashes** - `http://localhost:5173` not `http://localhost:5173/`

### Code Integration

```typescript
// Backend: Construct callback URL
const callbackUrl = new URL(`${appUrl}/auth/callback`);
callbackUrl.searchParams.set("accessToken", accessToken);
callbackUrl.searchParams.set("userId", user.id);
return Response.redirect(callbackUrl.toString(), 302);
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "redirect_uri_mismatch" | URL not in whitelist | Add exact URL to dashboard |
| "invalid_redirect_uri" | Malformed URL | Check protocol, port, path |
| Infinite redirect loop | Wrong callback handling | Verify frontend callback route |

---

## 2. Sign-out Redirect (CRITICAL)

**Purpose**: Where users land after logging out via WorkOS.

**Dashboard Path**: Redirects → Sign-out redirect → Add sign-out redirect

### Configuration

Add the **same URLs** as your Redirect URIs:

```
- http://localhost:5175
- http://localhost:5176
- https://your-domain.com
```

### Code Integration

```typescript
// Backend: Generate logout URL
import WorkOS from "@workos-inc/node";

const workos = new WorkOS(process.env.WORKOS_API_KEY);

const logoutUrl = workos.userManagement.getLogoutUrl({
  sessionId: sessionId,
  returnTo: "http://localhost:5175",  // Must be whitelisted!
});

return Response.redirect(logoutUrl, 302);
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Something went wrong" error page | `returnTo` URL not whitelisted | Add URL to sign-out redirects |
| Logout succeeds but wrong destination | Missing `returnTo` parameter | Pass explicit returnTo URL |

### Workaround (Skip WorkOS Logout)

If you can't configure the dashboard, clear local state only:

```typescript
const handleLogout = () => {
  clearAuthContext();           // Clear React context
  localStorage.clear();         // Clear stored tokens
  sessionStorage.clear();       // Clear session data
  window.location.href = "/";   // Redirect home
};
```

**Trade-off**: WorkOS session remains active until expiry. User can re-auth without credentials if session valid.

---

## 3. App Homepage URL

**Purpose**: Link displayed in AuthKit UI pages (logo click destination).

**Dashboard Path**: Redirects → App homepage URL → Edit app homepage URL

### When to Configure

- You want AuthKit logo to link to your app
- You want "Return to app" links in error pages

### Configuration

```
https://your-domain.com
```

**Note**: Optional. If not set, no homepage link appears in AuthKit UI.

---

## 4. Sign-in Endpoint

**Purpose**: Your app's endpoint that initiates WorkOS authentication.

**Dashboard Path**: Redirects → Sign-in endpoint → Edit sign-in endpoint

### When to Configure

- External systems need to trigger sign-in (email links, partner apps)
- You want a stable sign-in URL that doesn't change

### Configuration

```
https://your-domain.com/auth/login
```

### Code Integration

```typescript
// Frontend route: /auth/login
export function LoginPage() {
  useEffect(() => {
    // Redirect to WorkOS AuthKit
    const authUrl = `https://authkit.workos.com/authorize?` +
      `client_id=${WORKOS_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = authUrl;
  }, []);
  
  return <LoadingSpinner />;
}
```

---

## 5. Sign Up URL

**Purpose**: Where "Sign up" links in AuthKit pages navigate.

**Dashboard Path**: Redirects → Sign up URL → Edit sign up URL

### When to Configure

- You have a custom registration flow
- You want to capture additional data during signup
- You need role selection before account creation

### Configuration

```
https://your-domain.com/register
https://gentle-wagon-89-staging.authkit.app/sign-up  (default AuthKit)
```

### Use Case: Role Selection

```
1. User clicks "Sign up" in AuthKit
2. Redirects to /register/choose-role
3. User selects role (employer, doctor, etc.)
4. Redirects back to AuthKit with role context
5. Account created with role metadata
```

---

## 6. User Invitation URL

**Purpose**: Landing page when users click invitation email links.

**Dashboard Path**: Redirects → User invitation URL → Edit user invitation URL

### When to Configure

- You send invitations via WorkOS
- You want custom invitation acceptance flow

### Configuration

```
https://your-domain.com/invite/accept
https://gentle-wagon-89-staging.authkit.app/invite  (default AuthKit)
```

### Code Integration

```typescript
// Route: /invite/accept?token=xxx
export function AcceptInvitePage() {
  const token = useSearchParams().get("token");
  
  // Validate invitation token
  // Show account setup form
  // Complete registration
}
```

---

## 7. Password Reset URL

**Purpose**: Landing page when users click password reset email links.

**Dashboard Path**: Redirects → Password reset URL → Edit password reset URL

### When to Configure

- You want custom password reset UI
- You need additional verification steps

### Configuration

```
https://your-domain.com/auth/reset-password
https://gentle-wagon-89-staging.authkit.app/reset-password  (default AuthKit)
```

---

## 8. Admin Portal Redirects

**Purpose**: Where users land after completing Admin Portal actions.

**Dashboard Path**: Redirects → Admin Portal redirects → Edit Admin Portal redirects

### Sub-settings

| Setting | Purpose |
|---------|---------|
| Logo URI | Link when clicking portal logo |
| Single Sign-On success URI | After SSO configuration complete |
| Directory Sync success URI | After directory sync setup |
| Log Streams success URI | After log stream configuration |
| Domain Verification success URI | After domain verified |

### When to Configure

- You embed Admin Portal in your app
- You want users returned to specific pages after setup tasks

### Configuration

```
Logo URI: https://your-domain.com/admin
SSO success URI: https://your-domain.com/admin/sso/complete
Directory Sync success URI: https://your-domain.com/admin/directory/complete
```

---

## Environment-Specific Configuration

### Development Checklist

```
✅ Redirect URIs:
   - http://localhost:5173
   - http://localhost:5174
   - http://localhost:5175
   - http://localhost:5176

✅ Sign-out redirects:
   - http://localhost:5173
   - http://localhost:5174
   - http://localhost:5175
   - http://localhost:5176

⬜ App homepage URL: (optional for dev)
⬜ Sign-in endpoint: (optional for dev)
⬜ Sign up URL: (use default or custom)
⬜ User invitation URL: (use default)
⬜ Password reset URL: (use default)
⬜ Admin Portal redirects: (optional)
```

### Production Checklist

```
✅ Redirect URIs:
   - https://your-domain.com
   - https://app.your-domain.com (if applicable)
   
✅ Sign-out redirects:
   - https://your-domain.com
   - https://app.your-domain.com

✅ App homepage URL:
   - https://your-domain.com

✅ Sign-in endpoint:
   - https://your-domain.com/auth/login

✅ Sign up URL:
   - https://your-domain.com/register (or default)

✅ User invitation URL:
   - https://your-domain.com/invite/accept (or default)

✅ Password reset URL:
   - https://your-domain.com/auth/reset-password (or default)

⬜ Admin Portal redirects: (if using Admin Portal)
```

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "redirect_uri_mismatch" | Login redirect not whitelisted | Add to Redirect URIs |
| WorkOS error page on logout | Logout redirect not whitelisted | Add to Sign-out redirects |
| Can't log into different accounts | Cookie sharing across ports | Use incognito or different browser |
| Invitation links broken | Wrong invitation URL | Configure User invitation URL |
| Password reset fails | Wrong reset URL | Configure Password reset URL |
| "Something went wrong" | Generic - check all redirects | Verify all URLs match exactly |

---

## Security Considerations

1. **HTTPS in production** - Never use HTTP for production redirect URIs
2. **Exact match required** - URLs must match exactly (no wildcards)
3. **No open redirects** - Don't pass user-controlled values to `returnTo`
4. **Token in URL is OK** - OAuth callbacks with tokens in URL are standard
5. **Short-lived tokens** - Tokens in callbacks are processed immediately

---

## API Reference

### Get Logout URL

```typescript
const logoutUrl = workos.userManagement.getLogoutUrl({
  sessionId: string,       // Required: WorkOS session ID
  returnTo?: string,       // Optional: Must be whitelisted
});
```

### Authorization URL Parameters

```
https://authkit.workos.com/authorize?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&     // Must be whitelisted
  response_type=code&
  state={STATE}&                   // CSRF protection
  code_challenge={CHALLENGE}&      // PKCE
  code_challenge_method=S256
```

---

## Related Documentation

- [WorkOS AuthKit Documentation](https://workos.com/docs/user-management/authkit)
- [WorkOS Redirect Configuration](https://workos.com/docs/user-management/authkit/redirect-uris)
- [WorkOS Logout](https://workos.com/docs/user-management/authkit/sign-out)
