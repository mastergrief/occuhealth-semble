/**
 * OpenAI Provider Implementation
 * Uses gpt-5-mini model for medical report generation
 */

import OpenAI from "openai";
import type {
  AIProvider,
  ReportSuggestionInput,
  ReportSuggestionOutput,
} from "./types";
import { withRetry } from "../retry";
import { reportSuggestionPrompt } from "../prompts/reportSuggestion";
import {
  validateAIResponse,
  type ReportSuggestionRaw,
} from "../schemas/reportSuggestion";

/**
 * Default model configuration
 * CRITICAL: gpt-5-mini does NOT support temperature parameter
 */
const DEFAULT_MODEL = "gpt-5-mini";
const MAX_COMPLETION_TOKENS = 1500;

export class OpenAIProvider implements AIProvider {
  public readonly name = "openai";
  public readonly model: string;
  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model ?? process.env.OPENAI_MODEL_SUGGESTIONS ?? DEFAULT_MODEL;
  }

  /**
   * Generates AI-powered report suggestions from clinical findings
   * @param input - Clinical data and context
   * @returns Structured report suggestion
   */
  async generateReportSuggestion(
    input: ReportSuggestionInput
  ): Promise<ReportSuggestionOutput> {
    const prompts = reportSuggestionPrompt(input);

    const response = await withRetry(async () => {
      return this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        // NOTE: DO NOT add temperature - causes 400 error with gpt-5-mini
      });
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }

    let parsed: ReportSuggestionRaw;
    try {
      parsed = JSON.parse(content) as ReportSuggestionRaw;
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content.slice(0, 200)}`);
    }

    // Validate and transform the response
    return validateAIResponse(parsed);
  }
}
