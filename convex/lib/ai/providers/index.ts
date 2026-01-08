/**
 * AI Provider Factory
 * Lazy initialization with environment variable validation
 */

import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai";

// Singleton instance for provider reuse
let openaiProviderInstance: OpenAIProvider | null = null;

/**
 * Gets an AI provider instance
 * @param name - Provider name (currently only "openai" supported)
 * @returns AI provider instance
 * @throws Error if required environment variables are missing
 */
export function getAIProvider(name: "openai" = "openai"): AIProvider {
  if (name !== "openai") {
    throw new Error(`Unsupported AI provider: ${name}`);
  }

  // Lazy initialization with singleton pattern
  if (!openaiProviderInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiProviderInstance = new OpenAIProvider(apiKey);
  }

  return openaiProviderInstance;
}

// Re-export types for convenience
export * from "./types";
