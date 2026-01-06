# Implementation Fixes
**Sprint**: 04 of 06
**Index**: BOOKING_FLOW_FIX_INDEX
**Depends On**: BOOKING_FLOW_FIX_SPRINT_02_ARCHITECTURE, BOOKING_FLOW_FIX_SPRINT_03_SECURITY
**Next**: BOOKING_FLOW_FIX_SPRINT_05_ERROR_HANDLING

---

## Implementation Priority Matrix

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **P1** | Seed appointment types data | 5 min | CRITICAL |
| **P1** | Add requireAdmin to mutations | 30 min | CRITICAL |
| **P2** | Create admin UI for types | 4 hours | HIGH |
| **P2** | Add loading/empty states | 1 hour | MEDIUM |
| **P3** | Create seed script | 2 hours | MEDIUM |

---

## P1: Immediate Fix - Seed Data via CLI

Run these commands to populate the appointmentTypes table:

```bash
# 1. Initial Assessment (60 min)
npx convex run appointmentTypes:create '{
  "name": "Initial Assessment",
  "description": "Comprehensive occupational health assessment for new employees",
  "durationMinutes": 60,
  "price": 0
}'

# 2. Follow-up Consultation (30 min)
npx convex run appointmentTypes:create '{
  "name": "Follow-up Consultation",
  "description": "Follow-up appointment after initial assessment",
  "durationMinutes": 30,
  "price": 0
}'

# 3. Health Screening (45 min)
npx convex run appointmentTypes:create '{
  "name": "Health Screening",
  "description": "General occupational health screening",
  "durationMinutes": 45,
  "price": 0
}'

# 4. Return-to-Work Assessment (45 min)
npx convex run appointmentTypes:create '{
  "name": "Return-to-Work Assessment",
  "description": "Assessment for employees returning after extended absence",
  "durationMinutes": 45,
  "price": 0
}'

# 5. Fitness Reassessment (30 min)
npx convex run appointmentTypes:create '{
  "name": "Fitness Reassessment",
  "description": "Periodic fitness for work reassessment",
  "durationMinutes": 30,
  "price": 0
}'
```

**Verify seeding worked:**
```bash
npx convex run appointmentTypes:listActive '{}'
# Should return array with 5 items
```

---

## P1: Security Fix - Add Admin Auth

**File**: `convex/appointmentTypes.ts`

### Before (VULNERABLE)

```typescript
export const create = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    return ctx.db.insert("appointmentTypes", { ...args, isActive: true });
  },
});
```

### After (SECURE)

```typescript
import { requireAdmin } from "./authModules";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);  // ← ADD THIS LINE
    return ctx.db.insert("appointmentTypes", {
      ...args,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    typeId: v.id("appointmentTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    price: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { typeId, ...updates }) => {
    await requireAdmin(ctx);  // ← ADD THIS LINE
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(typeId, filteredUpdates);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);  // ← ADD THIS LINE
    return ctx.db.query("appointmentTypes").collect();
  },
});
```

---

## P2: Admin UI for Appointment Types

**Target Location**: `src/pages/admin/AppointmentTypes.tsx`

**Integration Points**:
1. Add route in `AdminLayout.tsx` (line ~131)
2. Add nav link in header (line ~117)
3. Optional: Add dashboard card (line ~39)

### Proposed Component Structure

```typescript
// src/pages/admin/AppointmentTypes.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AppointmentTypes() {
  const types = useQuery(api.appointmentTypes.listAll);
  const createType = useMutation(api.appointmentTypes.create);
  const updateType = useMutation(api.appointmentTypes.update);

  // State for new type form
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState({
    name: "",
    description: "",
    durationMinutes: 30,
    price: 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointment Types</h1>
        <Button onClick={() => setShowForm(true)}>Add Type</Button>
      </div>

      {/* Types List */}
      <div className="grid gap-4">
        {types?.map((type) => (
          <Card key={type._id}>
            <CardHeader className="flex flex-row justify-between">
              <div>
                <CardTitle>{type.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {type.durationMinutes} min • £{type.price / 100}
                </p>
              </div>
              <Switch
                checked={type.isActive}
                onCheckedChange={(checked) =>
                  updateType({ typeId: type._id, isActive: checked })
                }
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm">{type.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Type Modal */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          {/* Form fields for name, description, duration, price */}
        </Dialog>
      )}
    </div>
  );
}
```

### Route Integration

```typescript
// src/pages/AdminLayout.tsx (line ~131)
<Route path="appointment-types" element={<AppointmentTypes />} />

// Add nav link (line ~117)
<a href="/admin/appointment-types" className="...">
  Appointment Types
</a>
```

---

## P3: Seed Script for Deployment

**File**: `convex/seed/appointmentTypes.ts`

```typescript
import { internalMutation } from "../_generated/server";

export const seedAppointmentTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("appointmentTypes").first();
    if (existing) {
      console.log("Appointment types already seeded");
      return;
    }

    const types = [
      {
        name: "Initial Assessment",
        description: "Comprehensive occupational health assessment",
        durationMinutes: 60,
        price: 0,
        isActive: true,
      },
      {
        name: "Follow-up Consultation",
        description: "Follow-up appointment after assessment",
        durationMinutes: 30,
        price: 0,
        isActive: true,
      },
      {
        name: "Health Screening",
        description: "General occupational health screening",
        durationMinutes: 45,
        price: 0,
        isActive: true,
      },
      {
        name: "Return-to-Work Assessment",
        description: "Assessment after extended absence",
        durationMinutes: 45,
        price: 0,
        isActive: true,
      },
    ];

    for (const type of types) {
      await ctx.db.insert("appointmentTypes", type);
    }

    console.log(`Seeded ${types.length} appointment types`);
  },
});
```

**Call during deployment:**
```bash
npx convex run seed/appointmentTypes:seedAppointmentTypes '{}'
```

---

## Implementation Checklist

| Task | File | Lines | Status |
|------|------|-------|--------|
| Seed appointment types via CLI | N/A | N/A | ⏳ Pending |
| Add requireAdmin to create() | appointmentTypes.ts | 46 | ⏳ Pending |
| Add requireAdmin to update() | appointmentTypes.ts | 64 | ⏳ Pending |
| Add requireAdmin to listAll() | appointmentTypes.ts | 25 | ⏳ Pending |
| Create AppointmentTypes.tsx | pages/admin/ | New | ⏳ Pending |
| Add route in AdminLayout | AdminLayout.tsx | ~131 | ⏳ Pending |
| Add nav link | AdminLayout.tsx | ~117 | ⏳ Pending |
| Create seed script | seed/appointmentTypes.ts | New | ⏳ Pending |

---

→ Next: BOOKING_FLOW_FIX_SPRINT_05_ERROR_HANDLING
