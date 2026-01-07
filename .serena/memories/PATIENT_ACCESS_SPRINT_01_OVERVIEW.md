# Patient Appointment Access - Overview & Architecture
**Sprint**: 01 of 04
**Index**: PATIENT_ACCESS_INDEX
**Depends On**: None
**Next**: PATIENT_ACCESS_SPRINT_02_BACKEND

---

## Feature Summary

**Goal**: Enable employees/patients to access their appointment details without requiring account creation.

**Phase 1 Components**:
1. **Magic Link** - Secure tokenized URL sent via email for appointment viewing
2. **Calendar Integration** - ICS file generation for calendar apps

**User Flow**:
```
Employer books appointment
        ↓
System generates magic link token (48hr TTL)
        ↓
Email sent to patient with:
  - Magic link URL
  - ICS calendar attachment
  - Plain text appointment details
        ↓
Patient clicks link → Views appointment (read-only)
Patient adds to calendar → Automatic reminders
```

---

## Architecture Decisions

### Why Magic Link over Full Portal?
| Factor | Magic Link | Full Portal |
|--------|------------|-------------|
| Implementation | ~2-3 days | ~2-3 weeks |
| Patient friction | Zero (no signup) | Account creation required |
| GDPR data | No new PII collected | New user table needed |
| Maintenance | Minimal | Ongoing auth management |
| Security | Time-limited tokens | Full session management |

### Security Model
- **Token**: UUID v4, SHA-256 hashed before storage
- **TTL**: 48 hours (configurable)
- **Single-use option**: Can invalidate after first view (optional)
- **Rate limiting**: Max 10 link generations per appointment per day
- **No sensitive data in URL**: Token only, details fetched server-side

---

## Database Schema Changes

### New Table: `appointmentTokens`
```typescript
// Add to convex/schema.ts
appointmentTokens: defineTable({
  tokenHash: v.string(),           // SHA-256 hash of token
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  createdAt: v.number(),
  expiresAt: v.number(),
  viewedAt: v.optional(v.number()), // Track first view
  invalidated: v.optional(v.boolean()),
})
  .index("by_token", ["tokenHash"])
  .index("by_appointment", ["appointmentId"])
  .index("by_expiry", ["expiresAt"]),
```

### Appointment Table Addition
```typescript
// Add to appointments table in schema.ts
calendarEventSent: v.optional(v.boolean()),
magicLinkSentAt: v.optional(v.number()),
```

---

## File Structure (New Files)

```
convex/
├── appointmentTokens.ts          # Token CRUD + validation
├── appointmentTokensModules/
│   ├── index.ts                  # Facade re-exports
│   ├── mutations.ts              # generate, invalidate
│   ├── queries.ts                # validate, getByToken
│   └── types.ts                  # TokenData type
├── lib/
│   └── icsGenerator.ts           # ICS file generation

src/
├── pages/
│   └── patient/
│       └── ViewAppointment.tsx   # Public appointment view page
├── components/
│   └── patient/
│       └── AppointmentDetails.tsx # Read-only appointment card

convex/http.ts                    # Add /appointment/:token route
```

---

## Integration Points

### Email Integration (Future)
- Currently: Manual link sharing or console log
- Future: Integrate with SendGrid/Resend/Postmark
- Placeholder: `sendAppointmentEmail()` function stub

### Existing Code Touchpoints
| File | Change |
|------|--------|
| `convex/schema.ts` | Add appointmentTokens table |
| `convex/appointments.ts` | Add token generation on book |
| `convex/http.ts` | Add public token validation endpoint |
| `src/App.tsx` | Add /view-appointment/:token route |

---

## Acceptance Criteria

### Sprint 01 (This Sprint)
- [x] Architecture documented
- [x] Schema changes defined
- [x] File structure planned
- [x] Security model specified

### Overall Phase 1
- [ ] Patient can view appointment via magic link (Sprint 02)
- [ ] ICS calendar file generated and downloadable (Sprint 03)
- [ ] Browser-CLI tests pass for full flow (Sprint 04)

---

→ Next: PATIENT_ACCESS_SPRINT_02_BACKEND
