# OccuHealth Extension API Specification

## 100% Coverage Extensibility Analysis
Generated: 2026-01-03

---

## 1. CONVEX FUNCTION EXTENSION POINTS

### 1.1 Adding New Backend Modules

**Pattern**: Create new TypeScript file in `convex/` directory

```typescript
// convex/newModule.ts
import { v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// Query: Read-only data access
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db.query("tableName").take(args.limit ?? 100);
  },
});

// Mutation: Data modification
export const create = mutation({
  args: { field1: v.string(), field2: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.insert("tableName", { ...args, createdAt: Date.now() });
  },
});

// Internal: Server-to-server only (not exposed to client)
export const internalHelper = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => ctx.db.get(id as Id<"tableName">),
});

// Action: External API calls (has network access)
export const fetchExternal = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.external.com/data", {
      headers: { Authorization: `Bearer ${args.apiKey}` },
    });
    return response.json();
  },
});
```

**Auto-Generated API**: After `npx convex dev`, the new module is available:
```typescript
// Frontend usage
import { api } from "../convex/_generated/api";
const data = useQuery(api.newModule.list, { limit: 10 });
const create = useMutation(api.newModule.create);
```

### 1.2 Schema Extension Pattern

**Location**: `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,  // Required for Convex Auth (legacy)
  
  // Existing tables...
  
  // NEW TABLE EXTENSION:
  newEntity: defineTable({
    // Required fields
    ownerId: v.id("employers"),  // Foreign key to existing table
    name: v.string(),
    
    // Optional fields
    description: v.optional(v.string()),
    
    // Union types (enums)
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived")
    ),
    
    // Arrays
    tags: v.optional(v.array(v.string())),
    
    // Nested objects
    metadata: v.optional(v.object({
      source: v.string(),
      version: v.number(),
    })),
    
    // Flexible (use sparingly)
    extraData: v.optional(v.any()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),  // Soft delete for GDPR
  })
    // Indices for queries (required for .withIndex())
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_owner_status", ["ownerId", "status"])  // Composite
    .index("by_deleted", ["deletedAt"]),
});
```

**Validator Types Reference**:
| Type | Usage | Example |
|------|-------|---------|
| `v.string()` | Text | `name: v.string()` |
| `v.number()` | Numbers | `price: v.number()` |
| `v.boolean()` | Boolean | `isActive: v.boolean()` |
| `v.id("table")` | Foreign key | `userId: v.id("users")` |
| `v.optional(T)` | Nullable | `phone: v.optional(v.string())` |
| `v.union(...)` | Enum | `v.union(v.literal("a"), v.literal("b"))` |
| `v.array(T)` | Array | `tags: v.array(v.string())` |
| `v.object({})` | Nested | `meta: v.object({ key: v.string() })` |
| `v.any()` | Flexible | `data: v.any()` |

---

## 2. HTTP ROUTE EXTENSION POINTS

### 2.1 Adding New HTTP Endpoints

**Location**: `convex/http.ts`

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Existing routes...

// NEW ENDPOINT: Webhook handler
http.route({
  path: "/webhooks/new-service",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Verify signature (security)
    const signature = request.headers.get("X-Signature");
    const body = await request.text();
    
    // 2. Parse payload
    const payload = JSON.parse(body);
    
    // 3. Call internal mutations (not exposed to client)
    await ctx.runMutation(internal.newModule.processWebhook, {
      eventType: payload.type,
      data: payload.data,
    });
    
    // 4. Return response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// NEW ENDPOINT: Public API
http.route({
  path: "/api/v1/data",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    const data = await ctx.runQuery(internal.newModule.getById, { id });
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

### 2.2 External API Integration Pattern (Semble-like)

**Location**: `convex/externalService.ts`

```typescript
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Configuration from environment
const getClient = () => ({
  apiUrl: process.env.EXTERNAL_API_URL,
  apiKey: process.env.EXTERNAL_API_KEY,
  webhookSecret: process.env.EXTERNAL_WEBHOOK_SECRET,
});

// Action: Fetch from external API
export const syncPatients = action({
  args: {},
  handler: async (ctx) => {
    const config = getClient();
    
    // GraphQL example (Semble pattern)
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query GetPatients {
            patients { id name email }
          }
        `,
      }),
    });
    
    const { data } = await response.json();
    
    // Upsert to database
    for (const patient of data.patients) {
      await ctx.runMutation(internal.externalService.upsertPatient, patient);
    }
    
    return { synced: data.patients.length };
  },
});

// Internal mutation for data storage
export const upsertPatient = internalMutation({
  args: {
    id: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("externalPatients")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.id))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, syncedAt: Date.now() });
    } else {
      await ctx.db.insert("externalPatients", {
        externalId: args.id,
        ...args,
        createdAt: Date.now(),
        syncedAt: Date.now(),
      });
    }
  },
});
```

---

## 3. FRONTEND PAGE/ROUTE EXTENSION POINTS

### 3.1 Adding New Pages

**Step 1**: Create page component in `src/pages/`

```typescript
// src/pages/newFeature/NewFeatureDashboard.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function NewFeatureDashboard() {
  const data = useQuery(api.newModule.list, { limit: 10 });
  const createItem = useMutation(api.newModule.create);
  
  if (data === undefined) {
    return <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">New Feature Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <Card key={item._id}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button onClick={() => createItem({ field1: "New", field2: 42 })}>
        Add Item
      </Button>
    </div>
  );
}
```

**Step 2**: Add route in `src/App.tsx`

```typescript
// Import new page
import { NewFeatureDashboard } from "@/pages/newFeature/NewFeatureDashboard";

// Add to routes (inside existing Route structure)
<Route path="/employer" element={<EmployerAuthProvider><EmployerLayout /></EmployerAuthProvider>}>
  {/* Existing routes */}
  <Route path="dashboard" element={<EmployerDashboard />} />
  {/* NEW ROUTE */}
  <Route path="new-feature" element={<NewFeatureDashboard />} />
</Route>
```

### 3.2 Adding New Layout (Portal)

```typescript
// src/pages/NewRoleLayout.tsx
import { Outlet } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNewRoleAuth } from "@/lib/workos-auth";

export function NewRoleLayout() {
  const { workosUserId, isAuthenticated, isLoading } = useNewRoleAuth();
  const profile = useQuery(
    api.newRoleSettings.getByWorkosId,
    workosUserId ? { workosUserId } : "skip"
  );
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-64 border-r bg-card p-4">
        <a href="/new-role/dashboard">Dashboard</a>
        <a href="/new-role/settings">Settings</a>
      </nav>
      
      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet context={{ profile }} />
      </main>
    </div>
  );
}
```

---

## 4. AUTH PROVIDER EXTENSION POINTS

### 4.1 Adding New Role to WorkOS Auth

**Location**: `src/lib/workos-auth.tsx`

**Step 1**: Add storage key
```typescript
const STORAGE_KEYS: Record<UserRole, string> = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
  newRole: "workos_newrole_auth",  // NEW
};
```

**Step 2**: Update type
```typescript
export type UserRole = "admin" | "employer" | "doctor" | "newRole";
```

**Step 3**: Add role-specific hook
```typescript
export function useNewRoleAuth(): {
  isAuthenticated: boolean;
  isLoading: boolean;
  workosUserId: string | null;
  accessToken: string | null;
  loginAsNewRole: (workosUserId: string, accessToken: string, refreshToken: string) => void;
  logoutNewRole: () => void;
} {
  const auth = useWorkOSAuth();
  
  const loginAsNewRole = useCallback(
    (workosUserId: string, accessToken: string, refreshToken: string) => {
      auth.login("newRole", { workosUserId, accessToken, refreshToken });
    },
    [auth]
  );
  
  return {
    isAuthenticated: auth.role === "newRole" && auth.isAuthenticated,
    isLoading: auth.isLoading,
    workosUserId: auth.role === "newRole" ? (auth.tokens?.workosUserId ?? null) : null,
    accessToken: auth.role === "newRole" ? (auth.tokens?.accessToken ?? null) : null,
    loginAsNewRole,
    logoutNewRole: auth.logout,
  };
}

export const NewRoleAuthProvider = WorkOSAuthProvider;
```

**Step 4**: Update HTTP callback routing (`convex/http.ts`)
```typescript
// In /auth/callback handler
const [employer, doctor, adminUser, newRoleUser] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.newRoleSettings.getByWorkosId, { workosUserId: user.id }),  // NEW
]);

if (newRoleUser) {
  redirectPath = "/new-role";
} else if (adminUser) {
  // ... existing logic
}
```

---

## 5. UI COMPONENT EXTENSION POINTS (shadcn/ui)

### 5.1 Adding New UI Components

**Command**: Use shadcn CLI
```bash
npx shadcn@latest add [component-name]
# Examples:
npx shadcn@latest add table
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add alert
```

**Configuration**: `components.json`
```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

### 5.2 Custom Variant Extension

**Location**: `src/components/ui/button.tsx` (example)

```typescript
const buttonVariants = cva(
  "inline-flex items-center...",
  {
    variants: {
      variant: {
        // Existing variants
        default: "bg-primary...",
        destructive: "bg-destructive...",
        outline: "border...",
        
        // CUSTOM VARIANT (already exists)
        medical: "bg-medical-blue text-medical-blue-foreground hover:bg-medical-blue-dark shadow-md",
        "medical-outline": "border-2 border-medical-blue text-medical-blue hover:bg-medical-blue/10",
        
        // NEW CUSTOM VARIANT
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-amber-500 text-white hover:bg-amber-600",
      },
      // ...
    },
  }
);
```

### 5.3 Adding Custom Design Tokens

**Location**: `src/index.css`

```css
:root {
  /* Existing tokens */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  
  /* NEW CUSTOM TOKENS */
  --medical-blue: oklch(0.55 0.2 240);
  --medical-blue-foreground: oklch(1 0 0);
  --medical-blue-dark: oklch(0.45 0.2 240);
  
  --success: oklch(0.6 0.2 145);
  --warning: oklch(0.7 0.2 80);
}

.dark {
  /* Dark mode overrides */
  --medical-blue: oklch(0.65 0.2 240);
}
```

---

## 6. ENVIRONMENT VARIABLE PATTERNS

### 6.1 Backend (Convex) Environment

**Dashboard**: Convex Dashboard > Settings > Environment Variables
**Or CLI**: `npx convex env set VAR_NAME value`

```bash
# Required for WorkOS
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...

# App URLs
CONVEX_SITE_URL=https://deployment.convex.site
APP_URL=http://localhost:5175

# External API Integration
EXTERNAL_API_URL=https://api.service.com
EXTERNAL_API_KEY=key_...
EXTERNAL_WEBHOOK_SECRET=whsec_...

# Feature Flags (manual)
FEATURE_NEW_BOOKING_FLOW=true
```

**Access in Convex**:
```typescript
const apiKey = process.env.EXTERNAL_API_KEY;
if (!apiKey) throw new Error("EXTERNAL_API_KEY not configured");
```

### 6.2 Frontend (Vite) Environment

**Location**: `.env.local`

```bash
# VITE_ prefix required for client access
VITE_CONVEX_URL=https://deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_...

# Custom feature flags
VITE_FEATURE_NEW_UI=true
```

**Access in React**:
```typescript
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const featureEnabled = import.meta.env.VITE_FEATURE_NEW_UI === "true";
```

---

## 7. DATA CONTRACT INTERFACES

### 7.1 TypeScript Interfaces from Schema

**Auto-generated**: `convex/_generated/dataModel.d.ts`

```typescript
import { Doc, Id } from "../convex/_generated/dataModel";

// Document type (includes _id, _creationTime)
type Employer = Doc<"employers">;
// { _id: Id<"employers">, workosUserId: string, email: string, ... }

// ID type for references
type EmployerId = Id<"employers">;
```

### 7.2 Custom Interface Patterns

```typescript
// Enriched response type
type AppointmentWithRelations = Doc<"appointments"> & {
  patient: Doc<"patients"> | null;
  employer: Doc<"employers"> | null;
  appointmentType: Doc<"appointmentTypes"> | null;
};

// API response types
type GDPRStats = {
  pendingErasureCount: number;
  totalPatients: number;
  activeConsents: number;
  recentAuditLogs: Doc<"auditLogs">[];
};
```

---

## 8. ARCHITECTURAL CONSTRAINTS

### 8.1 Must Follow

1. **Modular Files**: Keep files < 400 LOC (flag > 400, must split > 800)
2. **Facade Pattern**: Use index.ts re-exports for component directories
3. **Type Safety**: TypeScript strict mode, explicit return types
4. **Soft Delete**: Use `deletedAt` field for GDPR-deletable entities
5. **Audit Logging**: Call `api.gdpr.logAction` for sensitive operations
6. **Index Usage**: Always define indices for queried fields

### 8.2 Convex-Specific Rules

1. **No Raw SQL**: Use Convex query builder only
2. **No Long-Running Actions**: Actions timeout at 2 minutes
3. **No Direct DB Access in Actions**: Must use `ctx.runQuery`/`ctx.runMutation`
4. **Internal Functions**: Use `internal.module.fn` for server-only access
5. **Schema Changes**: Require deployment via `npx convex deploy`

### 8.3 Auth Constraints

1. **WorkOS Primary**: Admin/Employer/Doctor use WorkOS AuthKit
2. **Token Expiration**: Check JWT exp before API calls
3. **Role-Based Routing**: Route based on table membership (http.ts callback)
4. **CSRF Protection**: OAuth state validation for all auth flows
5. **Session ID**: Required for proper WorkOS logout

---

## 9. EXTENSION CHECKLIST

### Adding New Feature Checklist

- [ ] Define table in `convex/schema.ts` with indices
- [ ] Create Convex module in `convex/newModule.ts`
- [ ] Run `npx convex dev` to generate types
- [ ] Add HTTP routes if needed in `convex/http.ts`
- [ ] Create React components in `src/components/newModule/`
- [ ] Add page components in `src/pages/newModule/`
- [ ] Update routes in `src/App.tsx`
- [ ] Update auth hooks if new role needed
- [ ] Add environment variables to Convex dashboard
- [ ] Update `.env.local` for frontend variables
- [ ] Run typecheck: `npm run typecheck`

### Adding External Integration Checklist

- [ ] Create action for API calls in `convex/externalService.ts`
- [ ] Create internal mutations for data storage
- [ ] Add webhook handler in `convex/http.ts`
- [ ] Implement signature verification
- [ ] Add environment variables for API keys
- [ ] Create idempotency handling (eventId tracking)
- [ ] Add to schema if new tables needed
- [ ] Test webhook locally with ngrok/similar

---

## 10. FILE REFERENCE

| Extension Type | File(s) | Pattern |
|---------------|---------|---------|
| New Table | `convex/schema.ts` | `defineTable({...}).index()` |
| New Backend Module | `convex/newModule.ts` | `query/mutation/action` exports |
| New HTTP Route | `convex/http.ts` | `http.route({path, method, handler})` |
| New Page | `src/pages/domain/Page.tsx` | React component with useQuery/useMutation |
| New Route | `src/App.tsx` | `<Route path="..." element={...} />` |
| New Auth Role | `src/lib/workos-auth.tsx` | Add to STORAGE_KEYS + hook |
| New UI Component | `src/components/ui/*.tsx` | `npx shadcn@latest add X` |
| New Component Set | `src/components/domain/index.ts` | Facade re-exports |
| Environment Var | `.env.local` + Convex Dashboard | VITE_ prefix for client |

---

**Summary**: OccuHealth provides a well-architected, modular full-stack platform with clear extension points at every layer. The Convex backend auto-generates type-safe APIs, the WorkOS auth system supports multiple roles via a unified context, and the shadcn/ui component system enables consistent UI extension. All patterns are documented above with working code examples.
