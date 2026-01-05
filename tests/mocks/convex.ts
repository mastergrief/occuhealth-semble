import { vi } from "vitest";

/**
 * Factory function to create mock query results.
 * Use this to configure what useQuery returns in tests.
 *
 * @example
 * ```ts
 * import { useQuery } from "convex/react";
 * import { createMockQueryResult } from "../mocks/convex";
 *
 * vi.mocked(useQuery).mockReturnValue(createMockQueryResult({
 *   data: [{ _id: "123", name: "Test" }],
 * }));
 * ```
 */
export function createMockQueryResult<T>(options: {
  data?: T;
  isLoading?: boolean;
  error?: Error | null;
} = {}): T | undefined {
  const { data, isLoading = false, error = null } = options;

  if (error) {
    throw error;
  }

  if (isLoading) {
    return undefined;
  }

  return data;
}

/**
 * Factory function to create mock mutation functions.
 * Returns a mock function that can be tracked and configured.
 *
 * @example
 * ```ts
 * import { useMutation } from "convex/react";
 * import { createMockMutation } from "../mocks/convex";
 *
 * const mockMutation = createMockMutation();
 * vi.mocked(useMutation).mockReturnValue(mockMutation);
 *
 * // Later in test
 * expect(mockMutation).toHaveBeenCalledWith({ id: "123" });
 * ```
 */
export function createMockMutation<TArgs = unknown, TResult = void>(options: {
  returnValue?: TResult;
  throwError?: Error;
} = {}): ReturnType<typeof vi.fn> {
  const { returnValue, throwError } = options;

  const mockFn = vi.fn<[TArgs], Promise<TResult>>();

  if (throwError) {
    mockFn.mockRejectedValue(throwError);
  } else {
    mockFn.mockResolvedValue(returnValue as TResult);
  }

  return mockFn;
}

/**
 * Factory function to create mock action functions.
 * Similar to mutations but for Convex actions.
 *
 * @example
 * ```ts
 * import { useAction } from "convex/react";
 * import { createMockAction } from "../mocks/convex";
 *
 * const mockAction = createMockAction({ returnValue: { success: true } });
 * vi.mocked(useAction).mockReturnValue(mockAction);
 * ```
 */
export function createMockAction<TArgs = unknown, TResult = void>(options: {
  returnValue?: TResult;
  throwError?: Error;
} = {}): ReturnType<typeof vi.fn> {
  return createMockMutation<TArgs, TResult>(options);
}

/**
 * Creates a mock Convex client for testing ConvexProvider consumers.
 *
 * @example
 * ```ts
 * import { createMockConvexClient } from "../mocks/convex";
 *
 * const mockClient = createMockConvexClient();
 * render(
 *   <ConvexProvider client={mockClient}>
 *     <Component />
 *   </ConvexProvider>
 * );
 * ```
 */
export function createMockConvexClient() {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    close: vi.fn(),
  };
}

/**
 * Helper to reset all Convex mock implementations.
 * Call this in beforeEach or afterEach to reset state between tests.
 *
 * @example
 * ```ts
 * import { resetConvexMocks } from "../mocks/convex";
 *
 * beforeEach(() => {
 *   resetConvexMocks();
 * });
 * ```
 */
export function resetConvexMocks() {
  const { useQuery, useMutation, useAction } = require("convex/react");
  vi.mocked(useQuery).mockReset();
  vi.mocked(useMutation).mockReset().mockReturnValue(vi.fn());
  vi.mocked(useAction).mockReset().mockReturnValue(vi.fn());
}
