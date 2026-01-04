# OccuHealth - Code Conventions

## TypeScript
- **Strict mode**: Enabled via tsconfig
- **No explicit any**: Allowed (eslint rule off)
- **Unused vars**: Warn only, ignore `_` prefix
- **Imports**: Use `@/` path alias for src

## File Organization
```
src/
├── components/
│   ├── ui/          # shadcn/ui primitives
│   ├── layout/      # NavigationBar, Footer
│   ├── auth/        # SignOutButton, AdminAuthCallback
│   ├── landing/     # Hero, Features, Testimonials, CTA
│   └── employer/    # Employer-specific components
├── pages/
│   ├── admin/       # Admin portal pages
│   ├── doctor/      # Doctor portal pages
│   ├── employer/    # Employer portal pages
│   └── register/    # Registration flows
├── lib/
│   ├── utils.ts     # cn() helper
│   └── workos-auth.tsx  # WorkOS auth providers
└── App.tsx          # Root routing

convex/
├── schema.ts        # Database schema
├── http.ts          # HTTP endpoints (auth callbacks)
├── authModules/     # Auth utilities
├── helpers/         # Shared helpers
└── *.ts             # Domain modules (appointments, patients, etc.)
```

## Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EmployerDashboard.tsx` |
| Hooks | camelCase, `use` prefix | `useWorkOSAuth` |
| Convex Functions | camelCase | `getPatients`, `createAppointment` |
| Files | PascalCase (components), camelCase (utils) | `Button.tsx`, `utils.ts` |
| CSS Classes | Tailwind only | `flex items-center gap-4` |

## Modular Architecture (Facade Pattern)
- **Threshold**: >400 lines = flag concern, >800 lines = must split
- **Pattern**: Facade file (<100 lines) + focused modules (~150-400 lines each)
- **Structure**: `module.ts` (facade) → `moduleModules/{mutations,queries,domain}.ts`

## Component Patterns
- Lazy loading for route components
- ErrorBoundary wrapping for portal routes
- Auth providers outside Suspense boundaries
- shadcn/ui for all UI primitives

## ESLint Overrides
```js
"@typescript-eslint/no-explicit-any": "off"
"@typescript-eslint/no-unsafe-*": "off"
"@typescript-eslint/require-await": "off"
"@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_" }]
```
