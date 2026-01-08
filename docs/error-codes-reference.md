# Error Codes Reference

This document provides a comprehensive reference for all standardized error codes used in the OccuHealth application.

## Overview

The application uses a centralized `ErrorCodes` pattern defined in `convex/lib/errorCodes.ts`. All backend mutations and queries throw `ConvexError` with a structured payload containing:

- `code`: A standardized error code string (e.g., `"UNAUTHORIZED"`)
- `message`: A human-readable description of the error

This pattern enables consistent error handling across the frontend and provides meaningful feedback to users.

### Why Use Standardized Error Codes?

1. **Consistent UX**: Users see predictable, helpful error messages
2. **Type Safety**: TypeScript ensures only valid error codes are used
3. **Debugging**: Error codes make logs searchable and actionable
4. **i18n Ready**: Codes can map to localized messages in the future

---

## Error Code Reference Table

| Code | User-Friendly Message | When Thrown | Recovery Action |
|------|----------------------|-------------|-----------------|
| `UNAUTHORIZED` | "Please sign in to continue" | User not authenticated or trying to access another user's resources | Redirect to login page |
| `FORBIDDEN` | "You don't have permission" | User authenticated but lacks required role/permissions | Show access denied message |
| `NOT_FOUND` | "The requested item was not found" | Resource (appointment, patient, slot) doesn't exist | Navigate back or refresh |
| `ALREADY_EXISTS` | "This item already exists" | Attempting to create duplicate resource | Show existing item or update instead |
| `SLOT_UNAVAILABLE` | "This time slot is no longer available" | Slot was booked/blocked between selection and submission | Refresh available slots |
| `SLOT_ALREADY_BOOKED` | "You already have a booking at this time" | User attempting to double-book same time slot | Show existing booking |
| `EMPLOYER_NOT_VERIFIED` | "Your account is pending verification" | Employer trying to use features requiring verification | Wait for admin approval |
| `RATE_LIMITED` | "Too many requests. Please wait" | Request throttling triggered | Wait and retry with exponential backoff |
| `VALIDATION_ERROR` | "Please check your input" | Form data fails schema validation | Highlight invalid fields |
| `INVALID_STATE` | "This action cannot be completed now" | Operation invalid for current resource state (e.g., blocking already-booked slot) | Refresh and check current state |
| `INVALID_TOKEN` | "Your access link has expired" | Magic link or appointment token is invalid | Request new link |
| `TOKEN_EXPIRED` | "Session expired, please log in again" | Auth session or refresh token expired | Redirect to login |
| `INVALID_INPUT` | "Invalid input provided" | General input validation failure | Review and correct input |
| `INTERNAL_ERROR` | "Something went wrong" | Unexpected server error | Retry or contact support |
| `CONFIGURATION_ERROR` | "System configuration issue" | Missing environment variables or misconfiguration | Contact administrator |
| `CONFLICT_DETECTED` | "Conflict detected with existing data" | Concurrent modification or scheduling conflict (e.g., recurring slots overlap) | Review conflicts and retry |
| `REPORT_NOT_FOUND` | "Report not found" | Medical report doesn't exist or was deleted | Navigate back to appointments |
| `INVALID_URL` | "Invalid URL format" | URL validation failed (e.g., Zoom link not from zoom.us/zoom.com) | Correct the URL format |

---

## Error Code Categories

### Authentication & Authorization
- `UNAUTHORIZED` - User not logged in
- `FORBIDDEN` - User lacks required permissions

### Token Management
- `INVALID_TOKEN` - Token validation failed
- `TOKEN_EXPIRED` - Token past expiration time

### Resource Operations
- `NOT_FOUND` - Resource doesn't exist
- `ALREADY_EXISTS` - Duplicate resource creation attempted

### Slot Booking
- `SLOT_UNAVAILABLE` - Slot no longer bookable
- `SLOT_ALREADY_BOOKED` - Double-booking prevention

### State & Transitions
- `INVALID_STATE` - Operation invalid for current state
- `CONFLICT_DETECTED` - Concurrent modification conflict

### Domain-Specific
- `REPORT_NOT_FOUND` - Medical report not found
- `INVALID_URL` - URL format validation failed
- `EMPLOYER_NOT_VERIFIED` - Account pending admin approval

### Rate Limiting
- `RATE_LIMITED` - Request throttling active

### Validation
- `VALIDATION_ERROR` - Schema validation failed
- `INVALID_INPUT` - General input validation failed

### Server Errors
- `INTERNAL_ERROR` - Unexpected server error
- `CONFIGURATION_ERROR` - System misconfiguration

---

## Frontend Handling Pattern

### Basic Error Handling

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

function BookingForm() {
  const bookAppointment = useMutation(api.appointments.book);

  const handleSubmit = async (data: BookingData) => {
    try {
      await bookAppointment(data);
      toast.success("Appointment booked successfully!");
    } catch (error) {
      handleConvexError(error);
    }
  };

  return (/* form JSX */);
}
```

### Centralized Error Handler

Create a utility function for consistent error handling across the application:

```typescript
// src/lib/errorHandler.ts
import { ConvexError } from "convex/values";
import { toast } from "sonner";

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Please sign in to continue",
  FORBIDDEN: "You don't have permission to perform this action",
  NOT_FOUND: "The requested item was not found",
  ALREADY_EXISTS: "This item already exists",
  SLOT_UNAVAILABLE: "This time slot is no longer available. Please select another.",
  SLOT_ALREADY_BOOKED: "You already have a booking at this time",
  EMPLOYER_NOT_VERIFIED: "Your account is pending verification",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  VALIDATION_ERROR: "Please check your input and try again",
  INVALID_STATE: "This action cannot be completed right now",
  INVALID_TOKEN: "Your access link has expired. Please request a new one.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  INVALID_INPUT: "Invalid input provided. Please review and try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again later.",
  CONFIGURATION_ERROR: "System configuration issue. Please contact support.",
  CONFLICT_DETECTED: "A conflict was detected. Please refresh and try again.",
  REPORT_NOT_FOUND: "The report was not found",
  INVALID_URL: "Please enter a valid URL",
};

export function handleConvexError(error: unknown): void {
  // Check if it's a ConvexError with our structured payload
  if (error instanceof ConvexError) {
    const data = error.data as { code?: string; message?: string };

    if (data.code && ERROR_MESSAGES[data.code]) {
      toast.error(ERROR_MESSAGES[data.code]);
      return;
    }

    // Fallback to the error message if code not recognized
    if (data.message) {
      toast.error(data.message);
      return;
    }
  }

  // Generic fallback
  toast.error("An unexpected error occurred. Please try again.");
  console.error("Unhandled error:", error);
}
```

### Error Handling with Navigation

For errors that require navigation (e.g., auth errors):

```typescript
// src/lib/errorHandler.ts
import { useNavigate } from "react-router-dom";

export function useErrorHandler() {
  const navigate = useNavigate();

  return (error: unknown) => {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };

      switch (data.code) {
        case "UNAUTHORIZED":
        case "TOKEN_EXPIRED":
          toast.error("Please sign in to continue");
          navigate("/");
          return;

        case "FORBIDDEN":
          toast.error("You don't have permission to access this page");
          navigate(-1); // Go back
          return;

        case "EMPLOYER_NOT_VERIFIED":
          toast.warning("Your account is pending verification");
          navigate("/employer/dashboard");
          return;

        default:
          handleConvexError(error);
      }
    } else {
      handleConvexError(error);
    }
  };
}
```

### Form-Level Error Display

For validation errors, display field-specific feedback:

```typescript
interface FormError {
  field?: string;
  message: string;
}

export function parseValidationError(error: unknown): FormError[] {
  if (error instanceof ConvexError) {
    const data = error.data as {
      code?: string;
      message?: string;
      fields?: Record<string, string>;
    };

    if (data.code === "VALIDATION_ERROR" && data.fields) {
      return Object.entries(data.fields).map(([field, message]) => ({
        field,
        message,
      }));
    }

    return [{ message: data.message || "Validation failed" }];
  }

  return [{ message: "An error occurred" }];
}
```

---

## Toast Notification Standards

### Toast Types by Error Severity

| Error Code | Toast Type | Duration | Dismissible |
|------------|------------|----------|-------------|
| `UNAUTHORIZED`, `TOKEN_EXPIRED` | `error` | 5000ms | Yes |
| `FORBIDDEN` | `error` | 5000ms | Yes |
| `NOT_FOUND`, `REPORT_NOT_FOUND` | `warning` | 4000ms | Yes |
| `SLOT_UNAVAILABLE`, `SLOT_ALREADY_BOOKED` | `warning` | 4000ms | Yes |
| `EMPLOYER_NOT_VERIFIED` | `info` | 6000ms | Yes |
| `RATE_LIMITED` | `warning` | 4000ms | Yes |
| `VALIDATION_ERROR`, `INVALID_INPUT` | `error` | 4000ms | Yes |
| `INVALID_STATE`, `CONFLICT_DETECTED` | `warning` | 4000ms | Yes |
| `INVALID_TOKEN` | `error` | 5000ms | Yes |
| `INVALID_URL` | `error` | 4000ms | Yes |
| `INTERNAL_ERROR`, `CONFIGURATION_ERROR` | `error` | 6000ms | Yes |
| `ALREADY_EXISTS` | `info` | 4000ms | Yes |

### Implementation with Sonner

```typescript
import { toast } from "sonner";

// Error toast (red)
toast.error("Please sign in to continue", { duration: 5000 });

// Warning toast (yellow)
toast.warning("This time slot is no longer available", { duration: 4000 });

// Info toast (blue)
toast.info("Your account is pending verification", { duration: 6000 });

// Success toast (green) - for successful operations
toast.success("Appointment booked successfully!", { duration: 3000 });
```

### Enhanced Toast with Actions

For errors with recovery actions:

```typescript
toast.error("Your session has expired", {
  duration: 6000,
  action: {
    label: "Sign In",
    onClick: () => navigate("/"),
  },
});

toast.warning("This time slot is no longer available", {
  duration: 5000,
  action: {
    label: "Refresh",
    onClick: () => refetchSlots(),
  },
});
```

---

## Backend Usage Examples

### Throwing Errors in Mutations

```typescript
import { ConvexError } from "convex/values";
import { ErrorCodes } from "./lib/errorCodes";

export const bookAppointment = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    // Check authentication
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Please sign in to book an appointment",
      });
    }

    // Check slot availability
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Time slot not found",
      });
    }

    if (slot.status !== "available") {
      throw new ConvexError({
        code: ErrorCodes.SLOT_UNAVAILABLE,
        message: "This slot is no longer available",
      });
    }

    // Proceed with booking...
  },
});
```

### Using Error Codes Consistently

```typescript
// Always use ErrorCodes constant for type safety
throw new ConvexError({
  code: ErrorCodes.VALIDATION_ERROR,  // Good - uses constant
  message: "Invalid date format",
});

// Avoid string literals (harder to refactor, typo-prone)
throw new ConvexError({
  code: "VALIDATION_ERROR",  // Works but not recommended
  message: "Invalid date format",
});
```

---

## Adding New Error Codes

When adding a new error code:

1. **Add to `convex/lib/errorCodes.ts`**:
   ```typescript
   export const ErrorCodes = {
     // ... existing codes
     NEW_ERROR_CODE: "NEW_ERROR_CODE",
   } as const;
   ```

2. **Update this documentation** with:
   - User-friendly message
   - When it's thrown
   - Recovery action

3. **Add to frontend error handler**:
   ```typescript
   const ERROR_MESSAGES: Record<string, string> = {
     // ... existing messages
     NEW_ERROR_CODE: "User-friendly message here",
   };
   ```

4. **Document toast configuration** for the new error type

---

## Troubleshooting

### Error Not Showing Toast

1. Ensure error is being caught in try/catch
2. Verify `handleConvexError` is being called
3. Check that Sonner `<Toaster />` is mounted in app root

### Wrong Error Message Displayed

1. Check that backend is using `ErrorCodes` constant
2. Verify error code matches key in `ERROR_MESSAGES`
3. Check for typos in error code string

### Error Not Reaching Frontend

1. Verify mutation/query is throwing `ConvexError` (not plain `Error`)
2. Check network tab for error response
3. Ensure error has `code` property in data payload
