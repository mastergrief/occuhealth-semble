# OccuHealth GDPR Pivot - WorkOS Auth for All Users

**Sprint**: 03 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: OCCUHEALTH_GDPR_SPRINT_02_SCHEMA
**Next**: OCCUHEALTH_GDPR_SPRINT_04_EMPLOYER

---

## Auth Strategy

**All users authenticate via WorkOS** (doctors, employers, admins)
- MFA configurable per organization
- Enterprise SSO support
- Single authentication pattern

---

## Role-Based Routing

After WorkOS callback, route users based on their role:

```
WorkOS OAuth Callback
        ↓
Check: Does workosUserId exist in...
        ↓
┌───────┴───────────────────────────────────────┐
│                                               │
▼                   ▼                   ▼       ▼
employers?      doctorSettings?     adminUsers?  NONE
    ↓               ↓                   ↓         ↓
/employer       /doctor             /admin    /register/choose-role
```

---

## HTTP Routes to Modify

### `convex/http.ts`

**Existing callback** (`/auth/callback`):
Add role detection after WorkOS token exchange:

```typescript
// After getting WorkOS user info...
const employer = await ctx.runQuery(internal.employers.getByWorkosId, { workosUserId });
const doctor = await ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId });
const admin = await ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId });

let redirectPath = "/register/choose-role";
if (employer) redirectPath = "/employer";
else if (doctor) redirectPath = "/doctor";  
else if (admin) redirectPath = "/admin";

return Response.redirect(`${APP_URL}${redirectPath}?accessToken=...`);
```

---

## New HTTP Routes

### `POST /auth/employer/register`
Create employer record after registration form submission:

```typescript
http.route({
  path: "/auth/employer/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    // Validate WorkOS token
    // Create employer record (status: "pending")
    // Return success
  }),
});
```

---

## Backend Functions

### `convex/employers.ts`

```typescript
// Internal query for auth routing
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db.query("employers")
      .withIndex("by_workos_user", q => q.eq("workosUserId", workosUserId))
      .first();
  },
});

// Create employer (called after registration)
export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    companyName: v.string(),
    companyType: v.union(v.literal("employer"), v.literal("insurer")),
    // ... other fields
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("employers", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

### `convex/doctorSettings.ts`

```typescript
export const getByWorkosId = internalQuery({
  args: { workosUserId: v.string() },
  handler: async (ctx, { workosUserId }) => {
    return ctx.db.query("doctorSettings")
      .withIndex("by_workos_user", q => q.eq("workosUserId", workosUserId))
      .first();
  },
});

export const create = mutation({
  args: {
    workosUserId: v.string(),
    email: v.string(),
    name: v.string(),
    zoomPersonalLink: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("doctorSettings", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

---

## Frontend Auth Context

### `src/lib/employer-auth.tsx`

Extend or create alongside existing `admin-auth.tsx`:

```typescript
interface EmployerAuthState {
  isAuthenticated: boolean;
  employer: Employer | null;
  isVerified: boolean;  // status === "verified"
}

export function useEmployerAuth() {
  // Check localStorage for WorkOS tokens
  // Query employer record from Convex
  // Return auth state
}
```

---

## Route Protection

### `/employer/*` routes
- Require WorkOS token
- Require employer record exists
- Show "pending verification" banner if `status !== "verified"`

### `/doctor/*` routes
- Require WorkOS token
- Require doctorSettings record exists

---

## Registration Flow

```
1. User clicks "Register as Employer"
       ↓
2. Redirect to WorkOS login
       ↓
3. WorkOS callback → no employer record found
       ↓
4. Redirect to /register/choose-role
       ↓
5. User selects "Employer" and fills form
       ↓
6. POST /auth/employer/register
       ↓
7. Employer created (status: "pending")
       ↓
8. Redirect to /employer (with pending banner)
```

---

## Success Criteria

- [ ] WorkOS callback routes users correctly by role
- [ ] New employers can register
- [ ] Employer gets "pending verification" state
- [ ] Doctor can log in and access /doctor

→ Next: OCCUHEALTH_GDPR_SPRINT_04_EMPLOYER
