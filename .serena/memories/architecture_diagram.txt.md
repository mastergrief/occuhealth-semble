=============================================================================
CONVEX MEDICAL STARTER - LANDING & AUTH ARCHITECTURE
=============================================================================

1. ENTRY POINT FLOW
─────────────────────────────────────────────────────────────────────────

                      Browser
                        |
                        v
                   index.html
                   /root div
                        |
                        v
                   main.tsx
                   --------
              1. Create ConvexReactClient
                 (VITE_CONVEX_URL)
              2. Wrap in ConvexAuthProvider
              3. Render <App />
                        |
                        v
                   App.tsx
                 --------
              Conditional Rendering
                        |
         _______|_________|_________
         |               |          |
         v               v          v
      Header       <Authenticated> <Unauthenticated>
         |               |          |
         |       <Content />    <SignInForm />
         |               |          |
      SignOut      Numbers   Email Input
      Button        Button   Password Input
                   shadcn/ui  Flow Toggle
                   Resources  Submit Button


2. ROUTE STRUCTURE (NO ROUTER - SPA)
─────────────────────────────────────────────────────────────────────────

    LANDING PAGE (Unauthenticated)
    ================================
    
    ┌─────────────────────────────────────┐
    │ Header: "Convex + React + Auth"     │
    │ [SignOut Button - HIDDEN]           │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │ H1: "Convex + React + Auth"         │
    ├─────────────────────────────────────┤
    │                                     │
    │   SIGN IN FORM (384px centered)     │
    │   ┌─────────────────────────────┐   │
    │   │ Email: [___________]        │   │
    │   ├─────────────────────────────┤   │
    │   │ Password: [__________]      │   │
    │   ├─────────────────────────────┤   │
    │   │ [    Sign In / Sign Up  ]   │   │
    │   ├─────────────────────────────┤   │
    │   │ Don't have an account?      │   │
    │   │ [Sign up instead - link]    │   │
    │   ├─────────────────────────────┤   │
    │   │ Error (if any): [message]   │   │
    │   └─────────────────────────────┘   │
    │                                     │
    └─────────────────────────────────────┘
    
    
    AUTHENTICATED PAGE
    ====================
    
    ┌─────────────────────────────────────┐
    │ Header: "Convex + React + Auth"     │
    │ [Sign out - VISIBLE]                │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │ H1: "Convex + React + Auth"         │
    ├─────────────────────────────────────┤
    │ Welcome John! (from auth user)      │
    │                                     │
    │ [Add a random number]               │
    │ Numbers: 5, 3, 7, 1, 9              │
    │                                     │
    │ ┌──────────────────────────────┐    │
    │ │  shadcn/ui Components Test   │    │
    │ │ ┌────────────────────────────┐    │
    │ │ │ [Card with Button Demo]    │    │
    │ │ └────────────────────────────┘    │
    │ └──────────────────────────────┘    │
    │                                     │
    │ Resources (2 columns):              │
    │ ├─ Convex Docs     ├─ Templates    │
    │ ├─ Stack Articles  ├─ Discord      │
    │                                     │
    └─────────────────────────────────────┘


3. AUTHENTICATION FLOW
─────────────────────────────────────────────────────────────────────────

    FRONTEND                        CONVEX BACKEND
    ============                    ===============
    
    User Input
         |
         v
    SignInForm
    (email, password, flow state)
         |
         v
    useAuthActions().signIn("password", formData)
         |
         |─── formData.set("flow", "signIn"|"signUp")
         |
         v
    HTTP POST /auth/password/*
    (Convex Auth handles)
         |
         v
    [Backend Auth Processing]
    ├─ Check if user exists
    ├─ Hash password comparison (signIn)
    ├─ Create user (signUp)
    └─ Issue session token
         |
         v
    Return: { sessionId, userId }
         |
         v
    Frontend: Auth state updated
         |
         v
    useConvexAuth() reflects: isAuthenticated = true
         |
         v
    <Authenticated> renders
    <Unauthenticated> hides
    

    PROTECTED DATA ACCESS
    
    Frontend (Content.tsx)
         |
         v
    useQuery(api.myFunctions.listNumbers, { count: 10 })
         |
         v
    [Convex Backend - Query Handler]
    ├─ getAuthUserId(ctx)
    │  └─ Checks session token in request
    ├─ Returns: { viewer: user.email, numbers: [...] }
    │  or null if not authenticated
         |
         v
    Frontend: Renders numbers list


4. AUTHENTICATION BOUNDARIES
─────────────────────────────────────────────────────────────────────────

    <App> Component
         |
         ├─ Conditional Rendering via <Authenticated> / <Unauthenticated>
         |
         ├─ <Authenticated> wrapper
         │  └─ Only renders children if useConvexAuth().isAuthenticated === true
         │     └─ Prevents unauthorized data display
         |
         └─ <Unauthenticated> wrapper
            └─ Only renders children if useConvexAuth().isAuthenticated === false
               └─ Prevents authenticated UI from showing


5. DATA FLOW (NO REDUX/VUEX - PURE HOOKS)
─────────────────────────────────────────────────────────────────────────

    SERVER STATE (Real-time Subscriptions)
    
    useQuery(api.myFunctions.listNumbers, { count: 10 })
         |
         v
    Convex subscribes to:
    ├─ numbers table
    ├─ Auto-refresh on mutations
    └─ Real-time sync across tabs
         |
         v
    Frontend: { viewer, numbers, isLoading }
    
    
    AUTH STATE
    
    useConvexAuth()
         |
         v
    Convex Auth provider tracks:
    ├─ isAuthenticated (boolean)
    ├─ user (User object)
    ├─ isLoading (boolean)
    └─ signIn/signOut actions
    
    
    UI STATE (Local Component)
    
    useState<"signIn" | "signUp">()
         |
         v
    Form flow toggle:
    ├─ flow state
    ├─ error message
    └─ input values (handled by browser form)


6. COMPONENT HIERARCHY
─────────────────────────────────────────────────────────────────────────

    <StrictMode>
        │
        └─ <ConvexAuthProvider client={convex}>
            │
            └─ <App>
                │
                ├─ <header>
                │  ├─ "Convex + React + Convex Auth + shadcn/ui" (text)
                │  └─ <SignOutButton>
                │     └─ [Sign out] (only if authenticated)
                │
                └─ <main>
                   ├─ <h1>"Convex + React + Convex Auth + shadcn/ui"</h1>
                   │
                   ├─ <Authenticated>
                   │  └─ <Content>
                   │     ├─ useQuery(listNumbers)
                   │     ├─ [Add a random number] button
                   │     ├─ Numbers display
                   │     ├─ <TestShadcn>
                   │     │  └─ <Card>
                   │     │     ├─ CardHeader (Title, Description)
                   │     │     ├─ CardContent (Text)
                   │     │     └─ CardFooter (Cancel, Confirm buttons)
                   │     └─ ResourceCard × 4 (2×2 grid)
                   │
                   └─ <Unauthenticated>
                      └─ <SignInForm>
                         ├─ <input type="email" name="email">
                         ├─ <input type="password" name="password">
                         ├─ <button type="submit">Sign In/Up</button>
                         ├─ Flow toggle link
                         └─ Error display (conditional)


7. STYLE ARCHITECTURE
─────────────────────────────────────────────────────────────────────────

    index.css
         |
         ├─ @import "tailwindcss" (core utilities)
         ├─ @import "tw-animate-css" (animations)
         ├─ @custom-variant dark (&:is(.dark *))
         │
         ├─ ROOT CSS VARIABLES (Light Mode)
         │  ├─ --color-light: #ffffff
         │  ├─ --color-dark: #171717
         │  ├─ --background: oklch(1 0 0) [white]
         │  ├─ --foreground: oklch(0.145 0 0) [dark gray]
         │  ├─ --primary: oklch(0.205 0 0) [near black]
         │  ├─ --border: oklch(0.922 0 0) [light gray]
         │  └─ --destructive: oklch(0.577 0.245 27.325) [red]
         │
         ├─ DARK MODE OVERRIDE (.dark class)
         │  ├─ --background: oklch(0.145 0 0) [dark gray]
         │  ├─ --foreground: oklch(0.985 0 0) [light gray]
         │  ├─ --primary: oklch(0.922 0 0) [near white]
         │  ├─ --border: oklch(1 0 0 / 10%) [white 10% alpha]
         │  └─ --destructive: oklch(0.704 0.191 22.216) [bright red]
         │
         ├─ @media (prefers-color-scheme: dark)
         │  └─ Auto-dark body: light text on dark background
         │
         └─ @layer base (global styles)
            ├─ Reset: border-color, outline-color
            └─ Body: background, foreground, font


8. HTTP ROUTES (convex/http.ts)
─────────────────────────────────────────────────────────────────────────

    auth.addHttpRoutes(http)
    │
    ├─ POST /auth/password/* (Convex Auth built-in)
    │  ├─ /password/signIn  → POST { email, password, flow: "signIn" }
    │  ├─ /password/signUp  → POST { email, password, flow: "signUp" }
    │  └─ /password/signOut → POST (clears session)
    │
    ├─ POST /webhooks/semble
    │  ├─ Verify HMAC-SHA256 signature
    │  ├─ Check idempotency (eventId)
    │  ├─ Store event (pending)
    │  ├─ Process by type:
    │  │  ├─ patient.created / patient.updated
    │  │  └─ appointment.* events
    │  └─ Mark processed/failed
    │
    └─ GET /health
       └─ { status: "healthy", timestamp, service }


9. TYPE SAFETY SETUP
─────────────────────────────────────────────────────────────────────────

    tsconfig.json (root monorepo)
         |
         ├─ references: tsconfig.app.json
         └─ references: tsconfig.node.json
    
    tsconfig.app.json (frontend)
         |
         ├─ target: ESNext
         ├─ jsx: react-jsx
         ├─ strict: true (all checks ON)
         │  ├─ noImplicitAny: true
         │  ├─ strictNullChecks: true
         │  ├─ strictFunctionTypes: true
         │  └─ ... (5 more)
         │
         ├─ paths: @/* → ./src/*
         ├─ include: [src, ORCHESTRATION]
         └─ exclude: [convex/_generated, **/_generated]
    
    Build Pipeline (npm run build)
         |
         ├─ build:typecheck → tsgo --project tsconfig.app.json
         │  └─ Full type check (blocks build if errors)
         │
         └─ build:app → vite build
            └─ Outputs to dist/


10. ENVIRONMENT SETUP
─────────────────────────────────────────────────────────────────────────

    .env.local (not committed)
         |
         ├─ CONVEX_DEPLOYMENT=dev:giddy-lapwing-915
         │  └─ Points to Convex dev environment
         │
         ├─ VITE_CONVEX_URL=https://giddy-lapwing-915.convex.cloud
         │  └─ Frontend uses this for ConvexReactClient
         │
         ├─ SEMBLE_API_URL=https://api.semble.io/graphql
         ├─ SEMBLE_CLIENT_ID=[email]
         ├─ SEMBLE_CLIENT_SECRET=[password]
         └─ SEMBLE_WEBHOOK_SECRET=[secret]
    
    Runtime Injection (vite)
         |
         └─ import.meta.env.VITE_CONVEX_URL
            └─ Available in frontend (VITE_ prefix)


11. KEY ARCHITECTURAL PATTERNS
─────────────────────────────────────────────────────────────────────────

    ✓ Auth Boundary Pattern
      └─ Wrap protected UI in <Authenticated> boundary
    
    ✓ Real-time Subscriptions
      └─ useQuery auto-subscribes to server data
    
    ✓ Form State Management
      └─ useState for UI, FormData for submission
    
    ✓ Error Handling
      └─ Catch signIn errors, display in state
    
    ✓ Type Safety First
      └─ Strict mode + tsgo ensures compile-time safety
    
    ✓ Modular Styling
      └─ Tailwind utilities + CSS custom properties
    
    ✓ Single Page App (SPA)
      └─ No React Router, conditional rendering instead
    
    ✓ Server State Management
      └─ Convex handles, no Redux/Vuex needed
    
    ✓ Authentication as Infrastructure
      └─ Built into Convex, not separate concern

=============================================================================
