# Landing & Authentication Architecture - Convex Medical Starter

## Project Overview
- **Name**: Convex Medical Starter
- **Stack**: React 19 + Vite + TypeScript + Convex + Semble API
- **Authentication**: Convex Auth (Password provider)
- **UI Framework**: shadcn/ui + Tailwind CSS v4
- **Type Safety**: tsgo (incremental builds with full type checking)

## Entry Point Flow

### 1. HTML Entry (index.html)
```
index.html
  └─ <div id="root"></div>
     └─ <script type="module" src="/src/main.tsx"></script>
```

**Key Points**:
- Single root element for React mounting
- Loads main.tsx as ES module
- Includes Tailwind CSS inline: `<link rel="stylesheet" href="/src/index.css">`
- Icon: `/convex.svg`

### 2. React Application Initialization (src/main.tsx)
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
```

**Initialization Stack**:
1. Creates ConvexReactClient with deployment URL from environment
2. Wraps App in ConvexAuthProvider (Convex Auth middleware)
3. Uses React 19 StrictMode for development warnings
4. Mounts to #root DOM element

**Environment**: Uses `VITE_CONVEX_URL` (from .env.local) for Convex cloud deployment URL

### 3. App Component (src/App.tsx) - Conditional Rendering
```typescript
export default function App() {
  return (
    <>
      <header>
        Convex + React + Convex Auth + shadcn/ui
        <SignOutButton />
      </header>
      <main>
        <h1>Convex + React + Convex Auth + shadcn/ui</h1>
        <Authenticated>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}
```

**Key Architecture**:
- **Layout**: Simple header + main container (single page, no routing)
- **Auth Boundaries**: Uses `<Authenticated>` and `<Unauthenticated>` components from Convex Auth
- **Conditional Rendering**: Shows SignInForm OR Content based on auth state

## Route Structure (No Router - Single Page App)

**Current Implementation**: Direct conditional rendering (NO React Router)
```
Landing Page (Unauthenticated):
├─ Header with SignOutButton (hidden if not authenticated)
├─ Sign In Form
│  ├─ Email input
│  ├─ Password input
│  ├─ Sign In / Sign Up toggle
│  ├─ Flow state switcher
│  └─ Error display
└─ Style: centered flex, 384px width, dark mode support

Authenticated Page:
├─ Header with SignOutButton (visible)
├─ Content component
│  ├─ Numbers list query
│  ├─ Add number button
│  ├─ shadcn/ui test component
│  └─ Resource links
└─ Style: full layout with padding
```

## Authentication Flow (Convex Auth)

### Backend Setup (convex/auth.ts)
```typescript
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

**Auth Configuration**:
- **Provider**: Password (email/password only)
- **Database Tables**: Automatically created via `authTables` in schema
- **HTTP Routes**: Added via `auth.addHttpRoutes(http)` in http.ts

### Frontend Authentication Hooks (from Convex Auth)
```typescript
useConvexAuth()           // { isAuthenticated, user, isLoading }
useAuthActions()          // { signIn, signOut, signUp }
Authenticated            // Conditional render wrapper
Unauthenticated          // Conditional render wrapper
```

### SignIn Flow (Frontend)
```typescript
function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e) => {
    const formData = new FormData(e.target);
    formData.set("flow", flow);  // "signIn" or "signUp"
    signIn("password", formData)
      .catch(error => setError(error.message));
  };
  
  // Form: email, password, flow selector, error display
}
```

**Auth States**:
- `flow === "signIn"`: Login existing user
- `flow === "signUp"`: Create new account
- Both use same form with label toggle

### SignOut Flow
```typescript
function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  
  return isAuthenticated && (
    <button onClick={() => void signOut()}>Sign out</button>
  );
}
```

## Protected Data Access Pattern

### Query with Auth Check (convex/myFunctions.ts)
```typescript
export const listNumbers = query({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = userId === null ? null : await ctx.db.get(userId);
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);
    
    return {
      viewer: user?.email ?? null,
      numbers: numbers.reverse().map(n => n.value),
    };
  },
});
```

**Pattern**: Queries check `getAuthUserId(ctx)` to ensure user is authenticated before accessing data

## Database Schema

### Auth Tables (from @convex-dev/auth)
```
users table (auto-generated)
└─ Convex Auth stores user records with email/password
credentials table (auto-generated)
└─ Stores password hashes securely
```

### Application Tables
```
numbers        # Example data table
├─ value: number
└─ _creationTime

semblePatients    # Semble API cache
sembleAppointments
sembleWebhookEvents
questionnaireSubmissions
```

## HTTP Routes (convex/http.ts)

### Auth Routes (Automatic)
```
POST /auth/.../*  - Convex Auth handles sign in/sign up/sign out
```

### Webhook Endpoint
```
POST /webhooks/semble - Receives patient/appointment updates from Semble
```

### Health Check
```
GET /health - Returns { status: "healthy", timestamp, service }
```

## Component Hierarchy

```
<App>
  ├─ <header>
  │  └─ <SignOutButton>
  │     └─ Conditional sign out button (if authenticated)
  ├─ <main>
  │  ├─ <h1>Page title</h1>
  │  ├─ <Authenticated>
  │  │  └─ <Content>
  │  │     ├─ Numbers list query (via useQuery)
  │  │     ├─ Add number button (via useMutation)
  │  │     ├─ <TestShadcn>
  │  │     │  └─ shadcn/ui component showcase
  │  │     └─ Resource cards
  │  └─ <Unauthenticated>
  │     └─ <SignInForm>
  │        ├─ Email input
  │        ├─ Password input
  │        ├─ Flow toggle (Sign in / Sign up)
  │        └─ Error display
  └─ (footer implicit - no explicit footer component)
```

## Layout Patterns

### Global Layout
- **Header**: Sticky top, border-bottom, contains SignOutButton
- **Main**: Flex column with gap-16, padding 32px (p-8)
- **Dark Mode**: Uses CSS dark media query + Tailwind dark: prefix
- **Colors**: CSS custom properties (oklch) for theme

### Form Layout (SignInForm)
- **Container**: flex-col gap-8, width-96 (384px), centered (mx-auto)
- **Inputs**: Full width, border-2, rounded-md, p-2
- **Button**: Full width, dark background toggle on dark mode
- **Error Display**: Red background/border container with mono font

### Content Layout
- **Container**: flex-col gap-8, max-width-lg, centered
- **Resources**: 2-column grid (w-1/2), flex gap-2
- **Cards**: bg-slate-200 dark:bg-slate-800, height 28 (h-28), overflow-auto

## Style Architecture

### CSS Framework
- **Engine**: Tailwind CSS v4 with vite plugin
- **Preflight**: Global reset via @layer base
- **Dark Mode**: CSS custom variant `@custom-variant dark`
- **Color Scheme**: Responds to OS preference `@media (prefers-color-scheme: ...)`

### Design Tokens (CSS Variables)
```css
Light Mode:
  --color-light: #ffffff
  --color-dark: #171717
  
Dark Mode:
  --background: oklch(0.145 0 0) [dark gray]
  --foreground: oklch(0.985 0 0) [light gray]
  --primary: oklch(0.922 0 0) [near white]
  --border: oklch(1 0 0 / 10%) [white with transparency]
  --destructive: oklch(0.704 0.191 22.216) [red]
```

### shadcn/ui Components
- Card (src/components/ui/card.tsx) - Flexible card container
- Button (src/components/ui/button.tsx) - Accessible button with variants
- Full Tailwind theme integration (border, background, foreground colors)

## Type Safety Setup

### Configuration
```json
tsconfig.json (root)
  └─ references: [tsconfig.app.json, tsconfig.node.json]

tsconfig.app.json (frontend)
  ├─ target: ESNext
  ├─ jsx: react-jsx
  ├─ strict: true (all checks enabled)
  ├─ paths: @/* -> ./src/*
  └─ include: [src, ORCHESTRATION]

convex/tsconfig.json (backend)
  └─ Convex-specific type checking
```

### Compilation Tools
- **Frontend**: tsgo for incremental builds with watch mode
- **Build**: `npm run build` triggers typecheck then vite build
- **Dev**: `npm run dev:typecheck` watches for type errors

## Environment Configuration

### Frontend
```
VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud
```

### Backend
```
CONVEX_DEPLOYMENT=dev:giddy-lapwing-915
CONVEX_SITE_URL=[auto-configured by Convex]
SEMBLE_API_URL=https://api.semble.io/graphql
SEMBLE_CLIENT_ID=[user email]
SEMBLE_CLIENT_SECRET=[user password]
SEMBLE_WEBHOOK_SECRET=[webhook verification key]
```

## Build & Development Commands

```bash
npm run dev                    # Start all services
  ├─ dev:frontend            # Vite dev server + auto-open
  ├─ dev:backend             # Convex dev
  └─ dev:typecheck           # tsgo --watch

npm run build                 # Production build
  ├─ build:typecheck         # Full type check
  └─ build:app               # Vite build -> dist/

npm run typecheck             # Type checking only
npm run lint                  # Linting + type check
npm run preview               # Preview built app
```

## State Management Pattern

### No Redux/Context - Pure Hooks
- **Server State**: Convex useQuery hooks (auto-subscribed to real-time updates)
- **Auth State**: Convex Auth hooks (useConvexAuth, useAuthActions)
- **UI State**: React useState (form inputs, error messages, flow toggle)

### Example (Content Component)
```typescript
const { viewer, numbers } = useQuery(api.myFunctions.listNumbers, { count: 10 }) ?? {};
const addNumber = useMutation(api.myFunctions.addNumber);

// UI state for form
const [value, setValue] = useState(0);
```

## Key Files and Responsibilities

| File | Purpose | Lines |
|------|---------|-------|
| index.html | HTML entry point with root div | 15 |
| src/main.tsx | React app initialization + Convex provider | 17 |
| src/App.tsx | Main component with auth boundaries | 227 |
| src/index.css | Tailwind + design tokens | 142 |
| convex/auth.ts | Convex Auth setup | 7 |
| convex/auth.config.ts | Auth provider domain config | 8 |
| convex/schema.ts | Database schema definition | 102 |
| convex/http.ts | HTTP routes + webhooks | 167 |
| convex/myFunctions.ts | Example query/mutation/action | 82 |
| vite.config.ts | Vite + React + Tailwind config | 15 |

## Key Patterns & Conventions

1. **Auth Boundary Pattern**: Wrap content in `<Authenticated>`/`<Unauthenticated>` components
2. **Error Handling**: useState for form errors, displayed in red box
3. **Styling**: Tailwind utility classes + CSS custom properties
4. **Type Safety**: TypeScript strict mode on everything
5. **Flow State**: Simple string toggle for sign-in vs sign-up
6. **No Routing**: Single page app (could add React Router later)
7. **Real-time**: Convex queries automatically subscribe to updates
