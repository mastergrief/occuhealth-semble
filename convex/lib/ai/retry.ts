/**
 * Retry Logic with Exponential Backoff
 * Handles transient API errors for AI provider calls
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

/**
 * Errors that should trigger a retry attempt
 */
const RETRYABLE_ERRORS = [
  "timeout",
  "econnreset",
  "etimedout",
  "rate_limit_exceeded",
  "server_error",
  "service_unavailable",
];

/**
 * Determines if an error should trigger a retry
 */
function isRetryable(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return RETRYABLE_ERRORS.some((e) => msg.includes(e));
}

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with exponential backoff retry logic
 * @param fn - Async function to execute
 * @param config - Optional retry configuration
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt or error is not retryable, stop
      if (attempt >= config.maxAttempts || !isRetryable(error)) {
        break;
      }

      // Wait with exponential backoff before retrying
      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Unknown error during retry");
}
