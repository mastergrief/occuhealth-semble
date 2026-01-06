# Feature Implementation - CRUD Gaps

**Sprint**: 03 of 06
**Index**: ADMIN_GAPS_INDEX
**Depends On**: ADMIN_GAPS_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION

---

## Feature 1: Appointment Types Edit/Delete

### 1.1 Schema Migration (REQUIRED FIRST)

**File**: `convex/schema.ts` (lines 106-113)

```typescript
// BEFORE
appointmentTypes: defineTable({
  name: v.string(),
  description: v.string(),
  durationMinutes: v.number(),
  price: v.number(),
  isActive: v.boolean(),
})
  .index("by_active", ["isActive"])

// AFTER
appointmentTypes: defineTable({
  name: v.string(),
  description: v.string(),
  durationMinutes: v.number(),
  price: v.number(),
  isActive: v.boolean(),
  deletedAt: v.optional(v.number()),  // NEW: soft delete timestamp
})
  .index("by_active", ["isActive"])
  .index("by_deleted", ["deletedAt"])  // NEW: for filtering

// ALSO ADD to appointments table:
appointments: defineTable({
  // ... existing fields
})
  .index("by_appointment_type", ["appointmentTypeId"])  // NEW: for FK check
```

### 1.2 Backend: Add Delete Mutation

**File**: `convex/appointmentTypes.ts` (add after line 75)

```typescript
export const remove = mutation({
  args: {
    typeId: v.id("appointmentTypes"),
  },
  handler: async (ctx, { typeId }) => {
    const admin = await requireAdmin(ctx);
    
    // Check if type exists
    const type = await ctx.db.get(typeId);
    if (!type) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Appointment type not found" });
    }
    
    // Check referential integrity
    const usedAppointment = await ctx.db
      .query("appointments")
      .withIndex("by_appointment_type", (q) => q.eq("appointmentTypeId", typeId))
      .first();
    
    if (usedAppointment) {
      // Soft delete - type is in use
      await ctx.db.patch(typeId, {
        deletedAt: Date.now(),
        isActive: false,
      });
      
      // Audit log
      await ctx.runMutation(internal.gdpr.logAction, {
        action: "appointment_type_soft_deleted",
        actorType: "admin",
        actorId: admin._id,
        resourceType: "appointmentType",
        resourceId: typeId,
        details: { name: type.name, reason: "in_use" },
      });
      
      return { softDeleted: true, reason: "Type has existing appointments" };
    }
    
    // Hard delete - safe to remove
    await ctx.db.delete(typeId);
    
    // Audit log
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "appointment_type_deleted",
      actorType: "admin",
      actorId: admin._id,
      resourceType: "appointmentType",
      resourceId: typeId,
      details: { name: type.name },
    });
    
    return { deleted: true };
  },
});
```

### 1.3 Backend: Update listAll Query

**File**: `convex/appointmentTypes.ts` (modify lines 25-32)

```typescript
export const listAll = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { includeDeleted }) => {
    await requireAdmin(ctx);
    
    if (includeDeleted) {
      return ctx.db.query("appointmentTypes").collect();
    }
    
    // Filter out soft-deleted
    return ctx.db
      .query("appointmentTypes")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
```

### 1.4 Frontend: Add Edit/Delete UI

**File**: `src/pages/admin/AppointmentTypes.tsx`

**New State (add after line 26):**
```typescript
const [editingType, setEditingType] = useState<Doc<"appointmentTypes"> | null>(null);
const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
const [deleteTargetId, setDeleteTargetId] = useState<Id<"appointmentTypes"> | null>(null);

const removeType = useMutation(api.appointmentTypes.remove);
```

**Edit Dialog Mode (modify dialog):**
```typescript
// Change dialog title dynamically
<DialogTitle>
  {editingType ? "Edit Appointment Type" : "Add New Appointment Type"}
</DialogTitle>

// Pre-populate form when editing
useEffect(() => {
  if (editingType) {
    setFormData({
      name: editingType.name,
      description: editingType.description,
      durationMinutes: editingType.durationMinutes,
      price: editingType.price,
    });
  }
}, [editingType]);

// Modify submit to use update for edits
const handleSubmit = async () => {
  if (editingType) {
    await updateType({ typeId: editingType._id, ...formData });
  } else {
    await createType(formData);
  }
  // Reset state
  setEditingType(null);
  setIsDialogOpen(false);
};
```

**Card Actions (add to each type card):**
```tsx
<div className="flex gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      setEditingType(type);
      setIsDialogOpen(true);
    }}
  >
    <Pencil className="h-4 w-4 mr-1" /> Edit
  </Button>
  <Button
    size="sm"
    variant="destructive"
    onClick={() => {
      setDeleteTargetId(type._id);
      setIsDeleteConfirmOpen(true);
    }}
  >
    <Trash2 className="h-4 w-4 mr-1" /> Delete
  </Button>
</div>
```

**Delete Confirmation Dialog:**
```tsx
<AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Appointment Type?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. If appointments exist for this type,
        it will be deactivated instead of deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={async () => {
          if (deleteTargetId) {
            await removeType({ typeId: deleteTargetId });
            setDeleteTargetId(null);
          }
          setIsDeleteConfirmOpen(false);
        }}
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Feature 2: Custom Employer Rejection Reason

### 2.1 Backend: Already Ready ✅

The `reject` mutation in `convex/employers.ts` already accepts a `reason` parameter.

### 2.2 Frontend: Add Rejection Dialog

**File**: `src/pages/admin/EmployerVerification.tsx`

**New State (add after imports):**
```typescript
const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
const [selectedEmployer, setSelectedEmployer] = useState<{
  id: string;
  companyName: string;
} | null>(null);
const [rejectionReason, setRejectionReason] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Modified Handler (replace line 23):**
```typescript
const openRejectDialog = (employerId: string, companyName: string) => {
  setSelectedEmployer({ id: employerId, companyName });
  setRejectionReason("");
  setRejectDialogOpen(true);
};

const handleReject = async () => {
  if (!selectedEmployer || rejectionReason.trim().length < 10) return;
  
  setIsSubmitting(true);
  try {
    await rejectEmployer({
      employerId: selectedEmployer.id as Id<"employers">,
      reason: rejectionReason.trim(),
    });
    setRejectDialogOpen(false);
    setSelectedEmployer(null);
    setRejectionReason("");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Rejection Dialog Component:**
```tsx
<Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reject Employer</DialogTitle>
      <DialogDescription>
        Provide a reason for rejecting {selectedEmployer?.companyName}.
        This will be stored for compliance records.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="reason">Rejection Reason *</Label>
        <Textarea
          id="reason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter reason for rejection (min 10 characters)"
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          {rejectionReason.length}/500 characters
        </p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleReject}
        disabled={rejectionReason.trim().length < 10 || isSubmitting}
      >
        {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Feature 3: Audit Log Filtering

### 3.1 Backend: Extend getAuditLogs Query

**File**: `convex/gdpr.ts` (replace lines 261-279)

```typescript
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    actorType: v.optional(
      v.union(
        v.literal("employer"),
        v.literal("doctor"),
        v.literal("admin"),
        v.literal("system")
      )
    ),
    resourceType: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { limit, action, actorType, resourceType, startTime, endTime }) => {
    await requireAdmin(ctx);

    let results = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    // Apply filters
    if (action) {
      results = results.filter((log) => log.action === action);
    }
    if (actorType) {
      results = results.filter((log) => log.actorType === actorType);
    }
    if (resourceType) {
      results = results.filter((log) => log.resourceType === resourceType);
    }
    if (startTime) {
      results = results.filter((log) => log.timestamp >= startTime);
    }
    if (endTime) {
      results = results.filter((log) => log.timestamp <= endTime);
    }

    // Apply limit after filtering
    const maxLimit = limit && limit > 0 ? Math.min(limit, 1000) : 100;
    return results.slice(0, maxLimit);
  },
});
```

### 3.2 Frontend: Add Filter UI

**File**: `src/pages/admin/AuditLogs.tsx` (expand from 41 lines)

See ADMIN_GAPS_SPRINT_05_MANUAL_TESTING for full implementation and testing procedures.

---

## Acceptance Criteria

### Appointment Types Edit/Delete
- [ ] Schema includes `deletedAt` field and `by_deleted` index
- [ ] Schema includes `by_appointment_type` index on appointments
- [ ] `remove` mutation performs soft delete when type is in use
- [ ] `remove` mutation performs hard delete when safe
- [ ] Frontend shows Edit button that opens pre-populated form
- [ ] Frontend shows Delete button with confirmation dialog
- [ ] All actions logged to auditLogs

### Custom Rejection Reason
- [ ] Reject button opens dialog with textarea
- [ ] Minimum 10 characters required
- [ ] Custom reason passed to mutation
- [ ] Dialog shows employer company name

### Audit Log Filtering
- [ ] Backend accepts filter parameters (action, actorType, resourceType, dateRange)
- [ ] Frontend shows filter dropdowns
- [ ] Filters apply correctly to results

---

→ Next: ADMIN_GAPS_SPRINT_04_UX_IMPLEMENTATION
