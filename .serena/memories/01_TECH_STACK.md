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
| @convex-dev/workos | 0.0.1 | Bridges AuthKit to Convex auth system |
| @workos-inc/authkit-react | 0.11.x | React hooks/providers for AuthKit |
| @workos-inc/node | 7.79.x | Server-side WorkOS SDK (token refresh) |
| @convex-dev/auth | 0.0.90 | Auth tables (legacy) |
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
| `WORKOS_CLIENT_ID` | WorkOS app client ID (backend) |
| `VITE_WORKOS_CLIENT_ID` | WorkOS client ID (frontend) |
| `VITE_WORKOS_REDIRECT_URI` | AuthKit redirect URI |
| `WORKOS_API_KEY` | WorkOS API secret (backend only) |
| `TEST_*` | Test user credentials |

## Key Configuration Files
| File | Purpose |
|------|---------|
| `convex/auth.config.ts` | Two-provider JWT config for WorkOS |
| `convex/schema.ts` | Database schema definitions |
| `convex/http.ts` | HTTP endpoints (auth callbacks) |
| `src/main.tsx` | Convex + WorkOS provider setup |
| `src/lib/workos-auth.tsx` | Auth context and hooks |
