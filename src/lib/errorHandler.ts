import { ConvexError } from "convex/values";
import { toast } from "sonner";

/**
 * Extracts a user-friendly error message from various error types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === "string") {
      return data;
    }
    if (typeof data === "object" && data !== null && "message" in data) {
      return String((data as { message?: unknown }).message);
    }
    return String(data);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

/**
 * Handles mutation errors with toast notifications.
 * Use this in components that use toast-based error display.
 */
export function handleMutationError(error: unknown, context: string): void {
  const message = getErrorMessage(error);
  toast.error(`${context} failed`, { description: message });
  console.error(`[${context}]`, error);
}
