# OccuHealth - Tech Stack

## Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| React Router | 7.x | Client-side routing |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | - | Component library (Radix primitives) |
| Vite | 6.x | Build tool |
| Lucide React | 0.544.x | Icons |

## Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Convex | 1.31.x | Real-time database + serverless functions |
| @convex-dev/auth | 0.0.90 | Auth tables (legacy) |
| WorkOS Node | 7.79.x | Admin/Doctor/Employer auth |
| Zod | 3.24.x | Schema validation |

## Mobile
| Technology | Version | Purpose |
|------------|---------|---------|
| Capacitor Core | 7.4.x | Cross-platform mobile |
| Capacitor iOS | 7.4.x | iOS native bridge |
| Capacitor Android | 7.4.x | Android native bridge |

## Development Tools
| Tool | Purpose |
|------|---------|
| tsgo (@typescript/native-preview) | Fast typecheck (~10x faster than tsc) |
| ESLint | Linting with TypeScript support |
| Prettier | Code formatting |
| Playwright | E2E testing |
| Browser-CLI | Custom browser automation tool |
| CONVEX-CLI | Convex data inspection scripts |

## Path Aliases
```
@/* → ./src/*
```

## Environment Variables
| Variable | Purpose |
|----------|---------|
| `CONVEX_DEPLOYMENT` | Convex deployment ID |
| `VITE_CONVEX_URL` | Convex cloud URL |
| `WORKOS_CLIENT_ID` | WorkOS app client ID |
| `WORKOS_API_KEY` | WorkOS API secret |
| `TEST_*` | Test user credentials |
