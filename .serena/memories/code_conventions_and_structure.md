# Code Conventions & Project Structure

## Codebase Overview

### Technology Stack
- **Frontend Framework**: React 19.0.0 (JSX, Hooks)
- **Build Tool**: Vite 6.2.0 (ES modules, HMR)
- **Styling**: Tailwind CSS v4 (@tailwindcss/vite plugin)
- **UI Components**: shadcn/ui (Button, Card)
- **Backend**: Convex (Real-time database + Functions)
- **Authentication**: @convex-dev/auth v0.0.90 (Password provider)
- **Type System**: TypeScript 5.7.2 (strict mode)
- **Type Checking**: tsgo (incremental builds with watch)
- **Package Manager**: npm 10+

### Project Purpose
Full-stack starter for healthcare applications with:
- Real-time Convex database
- Semble healthcare API integration
- User authentication with Convex Auth
- Webhook support for external data sync
- Mobile support (Capacitor for iOS/Android)

---

## Directory Structure

```
convex-medical-starter/
│
├── index.html                  # Entry HTML
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # Root TypeScript config
├── tsconfig.app.json           # Frontend TypeScript config
├── tsconfig.node.json          # Build tools TypeScript config
├── package.json                # Dependencies & scripts
│
├── src/                         # Frontend source
│   ├── main.tsx                 # React app entry (ConvexAuthProvider wrapper)
│   ├── App.tsx                  # Root component (auth boundaries)
│   ├── index.css                # Global styles (Tailwind + design tokens)
│   ├── vite-env.d.ts            # Vite type definitions
│   ├── test-shadcn.tsx          # shadcn/ui component demo
│   │
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx       # shadcn Button component
│   │       └── card.tsx         # shadcn Card component
│   │
│   └── lib/
│       └── utils.ts             # Utility functions (shadcn helper)
│
├── convex/                      # Convex backend
│   ├── auth.ts                  # Convex Auth setup (providers)
│   ├── auth.config.ts           # Auth provider domain config
│   ├── schema.ts                # Database schema definitions
│   ├── http.ts                  # HTTP routes (auth + webhooks)
│   ├── myFunctions.ts           # Example query/mutation/action
│   ├── semble.ts                # Semble API client (GraphQL)
│   ├── sembleWebhooks.ts        # Webhook event handlers
│   ├── tsconfig.json            # Convex TypeScript config
│   ├── README.md                # Convex documentation
│   │
│   └── _generated/
│       ├── api.d.ts             # Type-safe API exports
│       └── server.d.ts          # Server function types
│
├── public/                      # Static assets
│   └── convex.svg               # Favicon
│
├── dist/                        # Build output (vite build)
│
├── .env.local                   # Local environment variables (NOT committed)
├── .env.example                 # Environment template
│
├── components.json              # shadcn/ui configuration
├── eslint.config.js             # ESLint configuration
├── .prettierrc                   # Prettier formatting config
│
├── BROWSER-CLI/                 # Testing framework (Playwright)
├── CONVEX-CLI/                  # Convex CLI utilities
├── ORCHESTRATION/               # Workflow orchestration tools
│
└── .claude/                     # Claude/AI development configs
    └── rules/
        └── BROWSER-CLI/
            ├── NAV-MAP.md       # App-specific navigation patterns
            └── SKILL.md         # Browser CLI skill reference
```

---

## Code Style & Conventions

### TypeScript Settings
```json
{
  "strict": true,                          // All type checks enabled
  "noImplicitAny": true,                   // Variables must have types
  "strictNullChecks": true,                // Null/undefined explicit
  "noUnusedLocals": true,                  // Remove unused variables
  "noUnusedParameters": true,              // Remove unused params
  "noFallthroughCasesInSwitch": true,     // Switch requires break/return
  "noUncheckedSideEffectImports": true,   // Warn on side effects
  "forceConsistentCasingInFileNames": true
}
```

### Naming Conventions
- **Components**: PascalCase (e.g., `SignInForm`, `TestShadcn`, `Content`)
- **Functions**: camelCase (e.g., `listNumbers`, `addNumber`, `getAuthUserId`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `CONVEX_SITE_URL`)
- **Variables**: camelCase (e.g., `isAuthenticated`, `userId`, `error`)
- **CSS Classes**: kebab-case via Tailwind (e.g., `flex-col`, `gap-8`, `p-8`)

### Function Types
```typescript
// Server queries (Convex backend)
export const listNumbers = query({
  args: { count: v.number() },
  handler: async (ctx, args) => { ... }
});

// Server mutations
export const addNumber = mutation({
  args: { value: v.number() },
  handler: async (ctx, args) => { ... }
});

// Server actions (3rd party API calls)
export const myAction = action({
  args: { first: v.number(), second: v.string() },
  handler: async (ctx, args) => { ... }
});

// Frontend hooks
const { viewer, numbers } = useQuery(api.myFunctions.listNumbers, { count: 10 });
const addNumber = useMutation(api.myFunctions.addNumber);
const { isAuthenticated } = useConvexAuth();
```

### React Component Pattern
```typescript
// Functional component with hooks
export function ComponentName() {
  // 1. Hooks at top
  const [state, setState] = useState(initialValue);
  const data = useQuery(api.example);
  const mutation = useMutation(api.example);
  
  // 2. Handlers
  const handleClick = () => { /* ... */ };
  
  // 3. Conditional render
  if (data === undefined) return <div>loading...</div>;
  
  // 4. JSX return
  return (
    <div className="flex flex-col gap-8">
      {/* content */}
    </div>
  );
}

// Or named export in App.tsx
function SignInForm() { /* ... */ }
function Content() { /* ... */ }
```

### Error Handling
```typescript
// Form errors with state
const [error, setError] = useState<string | null>(null);

try {
  await signIn("password", formData);
} catch (error) {
  setError(error.message);
}

// Display in UI
{error && (
  <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
    Error: {error}
  </div>
)}
```

### Import Organization
```typescript
// 1. React/Framework imports
import { useState } from "react";
import { useConvexAuth } from "convex/react";

// 2. Third-party imports
import { Button } from "@/components/ui/button";

// 3. Local imports
import { api } from "../convex/_generated/api";

// 4. Type imports
import type { FormEvent } from "react";
```

---

## Styling Approach

### Tailwind CSS v4 Patterns
```tsx
// Spacing: p-8 (padding), m-4 (margin), gap-2 (gap)
<div className="p-8 flex flex-col gap-16">

// Responsive: Hidden on mobile, visible on desktop
<div className="hidden md:flex">

// Dark mode: dark: prefix
<button className="bg-slate-200 dark:bg-slate-800">

// Conditionals: Use template strings
className={`p-2 rounded-md ${isActive ? 'bg-blue-500' : 'bg-gray-500'}`}
```

### CSS Custom Properties
```css
/* Light mode (default) */
:root {
  --color-light: #ffffff;
  --color-dark: #171717;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

/* Dark mode override */
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}

/* Usage in Tailwind */
<div className="bg-background text-foreground">
```

### shadcn/ui Components
- Import from `@/components/ui/*`
- Use as: `<Button variant="outline">` or `<Card>`
- Fully styled with Tailwind
- No additional CSS needed

---

## Authentication Conventions

### Convex Auth Setup
```typescript
// Backend: Define providers
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

// HTTP routes automatically added by auth.addHttpRoutes(http)
```

### Frontend: Auth Boundaries
```typescript
// Wrap protected content
<Authenticated>
  <Dashboard />
</Authenticated>

<Unauthenticated>
  <LoginForm />
</Unauthenticated>
```

### Frontend: Check Auth State
```typescript
const { isAuthenticated, user, isLoading } = useConvexAuth();

// Sign in/out
const { signIn, signOut } = useAuthActions();
```

### Protected Data Access
```typescript
// Convex query automatically checks auth
const userId = await getAuthUserId(ctx);
if (userId === null) return null; // Not authenticated

// Return user-specific data
const user = await ctx.db.get(userId);
```

---

## Form Handling Pattern

### Sign In Form Example
```typescript
function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.set("flow", flow);
    
    try {
      await signIn("password", formData);
      // Success - auth state updates, component re-renders
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">{flow === "signIn" ? "Sign in" : "Sign up"}</button>
    </form>
  );
}
```

---

## Database Schema Pattern

### Table Definition
```typescript
defineSchema({
  tableName: defineTable({
    column1: v.string(),
    column2: v.optional(v.number()),
    column3: v.boolean(),
  })
    .index("by_column1", ["column1"])
    .searchIndex("search_name", {
      searchField: "column1",
      filterFields: ["column2"],
    }),
});
```

### Query Example
```typescript
export const getItem = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Mutation Example
```typescript
export const createItem = mutation({
  args: { name: v.string(), value: v.number() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("items", args);
    return id;
  },
});
```

---

## Development Commands

### Essential Commands
```bash
# Start development (all services in parallel)
npm run dev
  └─ Runs: vite (frontend), convex dev (backend), tsgo (type check)

# Build for production
npm run build
  └─ Runs: type check, then vite build

# Type checking only
npm run typecheck

# Linting (ESLint + TypeScript)
npm run lint

# Deploy to Convex
npm run convex:deploy

# Preview production build
npm run preview

# Mobile development
npm run cap:sync    # Sync Capacitor
npm run cap:ios     # Open iOS project
npm run cap:android # Open Android project
```

### Development Workflow
1. `npm run dev` - Starts all services
2. Edit files - Vite hot-reloads frontend, tsgo watches types
3. Check console for `[CONVEX M(...)]` mutation logs
4. Run `npm run typecheck` if stuck on types
5. `npm run lint` before committing

---

## Testing & Validation

### No Built-in Tests
- Project uses BROWSER-CLI for E2E testing (Playwright)
- See `.claude/rules/BROWSER-CLI/SKILL.md` for testing patterns
- Manual testing via browser recommended for auth flows

### Type Safety
- **TypeScript**: tsgo for incremental builds
- **Linting**: ESLint with strict rules
- **Pre-commit**: No pre-commit hooks currently

---

## Key Dependencies

### Frontend
- `react@19.0.0` - UI framework
- `convex@1.31.2` - Real-time database client
- `@convex-dev/auth@0.0.90` - Authentication
- `tailwindcss@4.0.14` - Styling
- `zod@3.24.1` - Validation

### Backend
- `convex/server` - Convex database & functions
- `@convex-dev/auth/server` - Auth providers
- Node.js crypto APIs (for webhook signature verification)

### Build Tools
- `vite@6.2.0` - Frontend bundler
- `typescript@5.7.2` - Type checking
- `eslint@9.21.0` - Linting
- `prettier@3.5.3` - Code formatting

---

## Important Restrictions & Patterns

### What NOT to Do
1. ❌ Don't use Redux/Zustand for server state
   - Convex useQuery handles subscriptions
2. ❌ Don't call `useQuery` inside loops or conditions
   - Must be at component top level
3. ❌ Don't hardcode API URLs
   - Use environment variables (VITE_CONVEX_URL)
4. ❌ Don't implement custom auth
   - Convex Auth handles password hashing & sessions
5. ❌ Don't create routes without React Router
   - Current app is SPA with conditional rendering

### Required Patterns
1. ✅ Wrap protected content in `<Authenticated>` boundary
2. ✅ Call `getAuthUserId(ctx)` in protected queries
3. ✅ Use FormData for form submissions (not JSON)
4. ✅ Check `userId === null` before accessing user data
5. ✅ Define validators with Zod (v.string(), v.number(), etc.)

---

## Build & Deployment Notes

### Frontend Build Output
- **Location**: `dist/` directory
- **Size**: Optimized bundle with tree-shaking
- **Assets**: Static files in `public/` copied to dist

### Backend Deployment
- **Command**: `npm run convex:deploy`
- **Production**: `npm run convex:deploy:prod`
- **Environment**: Variables injected at deploy time
- **Webhooks**: HTTPS endpoint auto-generated by Convex

### Type Checking in CI/CD
```bash
npm run typecheck  # Must pass before build
npm run lint       # Must pass before commit
```

---

## Performance Patterns

### Real-time Subscriptions (Automatic)
```typescript
// This automatically subscribes to updates
const data = useQuery(api.function, args);

// Unsubscribe when component unmounts (automatic)
```

### Memoization (Not Needed)
- Convex caches query results by default
- No need for `useMemo` or `useCallback` typically

### Code Splitting
- Vite auto-chunks on import (dynamic imports)
- shadcn components are imported on-demand

---

## Monorepo Structure

### Frontend (src/)
- React components and hooks
- Page-level components
- Utility functions

### Backend (convex/)
- Database schema
- Query/mutation/action definitions
- External API integrations
- Webhook handlers

### Tools (BROWSER-CLI/, CONVEX-CLI/, ORCHESTRATION/)
- Test automation
- CLI utilities
- Workflow tools

---

## Key Files Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| src/main.tsx | App initialization | None (side effects) |
| src/App.tsx | Root component | App (default) |
| convex/auth.ts | Auth setup | auth, signIn, signOut |
| convex/schema.ts | Database schema | default schema |
| convex/http.ts | HTTP routes | default router |
| convex/myFunctions.ts | Example functions | listNumbers, addNumber |
| src/components/ui/button.tsx | Button component | Button |
| src/components/ui/card.tsx | Card component | Card, CardHeader, etc. |

---

## Summary

This is a modern, type-safe, full-stack starter with:
- **React 19** + **Vite** for the frontend
- **Convex** for real-time backend & database
- **Convex Auth** for authentication
- **Tailwind CSS v4** for styling
- **TypeScript strict mode** for type safety
- **Single-page app** with conditional rendering (no React Router)
- **Real-time subscriptions** built in via Convex
- **Healthcare focus** with Semble API integration

All conventions emphasize type safety, simplicity, and leveraging Convex's built-in features instead of external libraries.
