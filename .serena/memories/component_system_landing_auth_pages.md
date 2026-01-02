# Component System Discovery: Landing & Auth Pages

**Date**: January 2, 2026
**Project**: convex-medical-starter
**Scope**: 100% coverage of landing/auth page component system

---

## Project Architecture Overview

**Tech Stack:**
- **Frontend**: React 19.0.0 + TypeScript 5.7.2
- **Styling**: Tailwind CSS v4.0.14 (via @tailwindcss/vite plugin)
- **UI Framework**: shadcn/ui (custom components + Radix UI)
- **Component Libs**: class-variance-authority (CVA), lucide-react icons
- **Utilities**: clsx, tailwind-merge
- **Auth**: @convex-dev/auth v0.0.90
- **Backend**: Convex with Semble healthcare API integration

**Build Setup:**
- Vite 6.2.0 with React plugin + Tailwind CSS plugin
- Path alias: `@` → `./src`
- CSS entry: `src/index.css` (imported in HTML)
- Main entry: `src/main.tsx` (root render)
- App component: `src/App.tsx` (Convex auth + landing/sign-in logic)

---

## Current State: What Exists

### 1. UI Components Created
**Location:** `src/components/ui/`

#### Button Component
- **File**: `src/components/ui/button.tsx` (59 lines)
- **Dependencies**: 
  - `@radix-ui/react-slot` (Slot for asChild pattern)
  - `class-variance-authority` (buttonVariants CVA)
  - `@/lib/utils` (cn utility)
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default (h-9), sm (h-8), lg (h-10), icon (h-9)
- **Features**:
  - Shadow & hover states (`shadow-xs`, `hover:bg-primary/90`)
  - Disabled state handling
  - Focus ring with destructive/validation states
  - SVG sizing normalization (`[&_svg:not([class*='size-'])]:size-4`)
  - Responsive gap handling (`has-[>svg]:px-3` for icons)
  - Accessible focus-visible ring states
- **Exports**: Button component + buttonVariants CVA
- **Data attr**: `data-slot="button"`

#### Card Component Family
- **File**: `src/components/ui/card.tsx` (92 lines)
- **Dependencies**: `@/lib/utils` (cn utility)
- **Exports**: 7 sub-components
  - **Card**: Main container (rounded-xl, border, shadow-sm, gap-6)
  - **CardHeader**: Header with grid layout (@container/card-header, auto-rows-min)
  - **CardTitle**: Semibold text
  - **CardDescription**: Muted foreground text (text-sm)
  - **CardAction**: Right-aligned action area (col-start-2, self-start)
  - **CardContent**: Main content area (px-6 padding)
  - **CardFooter**: Footer with flex layout (px-6, border-top support)
- **Features**:
  - Responsive grid layout (has-data-[slot=card-action]:grid-cols-[1fr_auto])
  - Container queries (@container/card-header)
  - Border handling (has-data-[slot=card-footer]:border-t)
  - Semantic slot-based structure
- **Data attrs**: `data-slot="card"`, `data-slot="card-header"`, etc.

### 2. Test Component
- **File**: `src/test-shadcn.tsx` (31 lines)
- **Purpose**: Demonstrates Card + Button shadcn/ui components
- **Usage**: Integrated in App.tsx authenticated view (shows if JS/styling working)
- **Imports**: Button (default variant), Card components

### 3. Landing/Auth Page (Current)
- **File**: `src/App.tsx` (227 lines)
- **Structure**:
  - **Header**: Sticky (top-0, z-10), bg-light dark:bg-dark, border-b-2
  - **SignOutButton**: Conditional render (isAuthenticated) - custom styled
  - **SignInForm**: Email/password form (lines 55-114)
    - Flow toggle: signIn ↔ signUp
    - State: `flow` (string), `error` (string | null)
    - Form submission: preventDefault, FormData with signIn()
    - Error display: Custom styled error box (red-500/20 bg, border)
    - Form fields: 2x input (email, password) - custom styled
    - Button: flow-dependent text, custom styled
    - Link toggle: Sign up/in link (styled with underline, hover states)
  - **Content**: Authenticated-only view with query/mutation examples
  - **ResourceCard**: Custom card component for resource links

### 4. Custom Styling in App.tsx (Inline Tailwind)
**Colors Used in Auth Form:**
- `bg-light` / `dark:bg-dark` (custom theme colors)
- `text-dark` / `dark:text-light` (inverses)
- `bg-slate-200` / `dark:bg-slate-800`
- `border-slate-200` / `dark:border-slate-800`
- `bg-red-500/20` / `border-red-500/50` (error state)

**Classes Used:**
- Layout: flex, flex-col, gap-*, w-96, mx-auto, p-*, h-28, overflow-auto
- Text: text-4xl, font-bold, text-center, font-mono, text-xs, text-sm
- Styling: rounded-md, border-2, p-2, shadow effects
- Interactive: hover:no-underline, cursor-pointer
- Dark mode: dark: prefix throughout

---

## Styling Architecture

### 1. Theme Configuration (src/index.css)

**Using Tailwind CSS v4.0 with OKLch color space:**

**Root Colors (Light Mode):**
- Background: oklch(1 0 0) - white
- Foreground: oklch(0.145 0 0) - dark
- Primary: oklch(0.205 0 0) - dark
- Primary-foreground: oklch(0.985 0 0) - off-white
- Secondary: oklch(0.97 0 0) - light gray
- Muted: oklch(0.97 0 0)
- Muted-foreground: oklch(0.556 0 0) - medium gray
- Accent: oklch(0.97 0 0)
- Destructive: oklch(0.577 0.245 27.325) - red hue
- Border: oklch(0.922 0 0) - light border
- Input: oklch(0.922 0 0)
- Ring: oklch(0.708 0 0)
- Chart colors: 5 distinct oklch values for data viz
- Sidebar colors: full set for future sidebar components

**Dark Mode Colors (.dark class):**
- Background: oklch(0.145 0 0) - dark
- Foreground: oklch(0.985 0 0) - white
- Primary: oklch(0.922 0 0) - light
- Primary-foreground: oklch(0.205 0 0) - dark
- Accent/Muted: oklch(0.269 0 0) - dark gray
- Border: oklch(1 0 0 / 10%) - white with 10% opacity
- Input: oklch(1 0 0 / 15%) - white with 15% opacity
- Destructive: oklch(0.704 0.191 22.216) - lighter red hue

**Custom Colors (index.css @theme):**
- light: #ffffff
- dark: #171717

**Radius System:**
- Base: 0.625rem (10px)
- Variants: sm (6px), md (8px), lg (10px), xl (14px)

### 2. Tailwind CSS Integration

**Setup:**
- V4.0 with @tailwindcss/vite plugin (Vite config)
- Custom variant: `@custom-variant dark (&:is(.dark *))`
- Prefers-color-scheme media query detection
- Font: Arial, Helvetica, sans-serif

**Animations:**
- tw-animate-css package imported (animation utilities)

**Layer Setup (@layer base):**
- Universal border: `@apply border-border outline-ring/50`
- Body: `@apply bg-background text-foreground`

### 3. Utility Functions
**File:** `src/lib/utils.ts` (7 lines)
```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
- Combines clsx + tailwind-merge for smart class merging
- Used in all shadcn/ui components for overrides

### 4. Icons
- **Library**: lucide-react (v0.544.0)
- **Status**: Installed but NOT USED in current components
- **Ready for**: Button icons, form icons, navigation

---

## Component Dependencies Map

```
App.tsx (Landing/Auth Page)
├── Header (custom inline styling)
├── SignOutButton (custom styling)
├── SignInForm (custom inline form)
│   ├── input[email] (HTML native)
│   ├── input[password] (HTML native)
│   └── button (custom styled, NOT shadcn)
├── Authenticated wrapper
│   ├── Content component
│   │   └── ResourceCard (custom styled div cards)
│   ├── Button (from @/components/ui/button) - ❌ NOT YET USED
│   └── TestShadcn component
│       ├── Card (from @/components/ui/card)
│       ├── CardHeader
│       ├── CardTitle
│       ├── CardDescription
│       ├── CardContent
│       ├── CardFooter
│       └── Button (2x, variants: outline, default)
└── Unauthenticated wrapper
    └── SignInForm

Dependencies:
├── @radix-ui/react-slot (Slot in Button)
├── class-variance-authority (buttonVariants CVA)
├── clsx (cn utility)
├── tailwind-merge (cn utility)
├── lucide-react (available, not used)
├── @convex-dev/auth/react (useAuthActions, useConvexAuth)
└── convex/react (Authenticated, Unauthenticated, useQuery, useMutation)
```

---

## Auth & Landing Page Patterns

### Authentication Flow
1. **Entry**: App.tsx renders
2. **Check**: useConvexAuth() determines authenticated state
3. **Conditional Render**:
   - **Unauthenticated**: SignInForm (email/password + toggle)
   - **Authenticated**: Content with data + TestShadcn demo
4. **Sign Flow**: Toggle between "signIn" and "signUp" 
5. **Sign Out**: Conditional button in header (isAuthenticated check)

### Form Handling
**Current Pattern:**
- Native FormData API (not react-hook-form)
- Manual error state management (`useState<string | null>`)
- onSubmit preventDefault + FormData collection
- signIn() from @convex-dev/auth/react
- Try-catch with error message display

**Validation:**
- HTML5 form attributes (type="email", type="password")
- Custom error state display with styled error box

---

## File Structure Summary

```
src/
├── App.tsx (227 lines)
│   ├── Landing page wrapper
│   ├── SignInForm component (custom)
│   ├── SignOutButton component (custom)
│   ├── Content component (authenticated view)
│   └── ResourceCard component (custom)
├── test-shadcn.tsx (31 lines)
│   └── TestShadcn component demo
├── main.tsx (17 lines)
│   └── React root + Convex provider
├── index.css (142 lines)
│   └── Theme + tailwind setup
├── vite-env.d.ts
├── components/
│   └── ui/
│       ├── button.tsx (59 lines, exported as Button, buttonVariants)
│       └── card.tsx (92 lines, exported as 7 components)
└── lib/
    └── utils.ts (7 lines, cn function)
```

---

## Missing Components (NOT YET CREATED)

Based on shadcn/ui component ecosystem and form needs:

**Form Components:**
- Input (text, email, password, number fields)
- Label (form labels)
- Form (react-hook-form integration)
- FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription

**Layout Components:**
- Container
- Grid
- Stack / Flex wrapper

**Typography Components:**
- Heading (h1-h6)
- Paragraph
- Muted
- Code

**Interactive Components:**
- Checkbox
- Radio
- Select / ComboBox
- Textarea
- Dialog / Modal
- AlertDialog
- Popover
- Tooltip
- Toast / Sonner

**Navigation:**
- Tabs
- Navigation Menu
- Breadcrumb

**Data Display:**
- Table
- Avatar
- Badge
- Progress
- Skeleton

---

## Color Scheme Current Usage

**Light Mode (Root):**
- Header bg: bg-light (#ffffff)
- Header border: border-slate-200
- Text: text-dark (#171717)
- Primary buttons: bg-dark text-light
- Secondary buttons: bg-slate-200 text-dark
- Form inputs: bg-light border-slate-200
- Error: bg-red-500/20 border-red-500/50

**Dark Mode:**
- Header bg: bg-dark (#171717)
- Header border: border-slate-800
- Text: text-light (#ffffff)
- Primary buttons: bg-light text-dark
- Secondary buttons: bg-slate-800 text-light
- Form inputs: bg-dark border-slate-800
- Error: bg-red-500/20 border-red-500/50 (consistent)

**Token Reference:**
All mapped to CSS variables in `:root` and `.dark` using OKLch color space.

---

## Recommendations

### 1. Standardize Form Components
- Create Input component (wrapper over HTML input)
- Create Label component
- Create Form wrapper with react-hook-form integration
- Move SignInForm from App.tsx to `src/components/pages/SignInForm.tsx`

### 2. Extract Layout Components
- Card is good foundation
- Consider Container for page max-width
- Add Grid/Flex helpers

### 3. Icon Integration
- lucide-react is ready (v0.544.0)
- Add Icons to Button variant with size adjustments
- Create Icon wrapper component

### 4. Dark Mode
- Custom variant `:is(.dark *)` already set up
- All colors respect dark: prefix
- Consider adding theme toggle component

### 5. Accessibility
- Button has focus-visible ring
- Card slots are semantic
- Add ARIA labels to form inputs
- Consider Form component with error display

---

## Dependencies Summary (UI-Relevant)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.0.0 | Core framework |
| tailwindcss | 4.0.14 | Styling |
| @tailwindcss/vite | 4.0.14 | Vite integration |
| class-variance-authority | 0.7.1 | CVA for component variants |
| @radix-ui/react-slot | 1.2.3 | Slot composition (Button asChild) |
| lucide-react | 0.544.0 | Icons (not yet used) |
| clsx | 2.1.1 | Conditional classes |
| tailwind-merge | 3.3.1 | Smart class merging |
| @convex-dev/auth | 0.0.90 | Auth provider + hooks |
| convex | 1.31.2 | Backend client |
| zod | 3.24.1 | Schema validation (available) |

**NOT INSTALLED (Common shadcn deps):**
- react-hook-form (NOT INSTALLED - using native FormData)
- @hookform/resolvers (NOT INSTALLED)
- radix-ui components other than react-slot (NOT INSTALLED)
- sonner (toast notifications - NOT INSTALLED)

