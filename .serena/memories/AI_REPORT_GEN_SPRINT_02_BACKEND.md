# AI Report Generation - Backend Infrastructure

**Sprint**: 02 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: AI_REPORT_GEN_SPRINT_01_OVERVIEW
**Next**: AI_REPORT_GEN_SPRINT_03_ACTION

---

## Objective

Create the foundational AI infrastructure in `convex/lib/ai/` following modular architecture patterns.

## Directory Structure

```
convex/lib/ai/
├── providers/
│   ├── types.ts           # AIProvider interface
│   ├── openai.ts          # GPT-5-mini implementation
│   └── index.ts           # Factory/registry
├── prompts/
│   ├── reportSuggestion.ts  # Medical report prompts
│   └── index.ts
├── schemas/
│   └── reportSuggestion.ts  # Zod validation
├── retry.ts               # Exponential backoff
└── index.ts               # Facade exports
```

## Implementation Tasks

### Task 2.1: Create Provider Interface

**File**: `convex/lib/ai/providers/types.ts`

```typescript
export interface AIProvider {
  name: string;
  model: string;
  generateReportSuggestion(input: ReportSuggestionInput): Promise<ReportSuggestionOutput>;
}

export interface ReportSuggestionInput {
  clinicalFindings: string;
  diagnosis?: string;
  appointmentType: string;
  reasonForAppointment?: string;
  patientJobTitle?: string;
  patientDepartment?: string;
  patientAge?: number;
}

export interface ReportSuggestionOutput {
  fitForWork: "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";
  summary: string;
  restrictions: StructuredRestriction[];
  followUpRequired: boolean;
  followUpNotes?: string;
  confidence: number;
}

export interface StructuredRestriction {
  code: string;
  category: string;
  description: string;
  duration?: string;
}
```

### Task 2.2: Create Retry Logic

**File**: `convex/lib/ai/retry.ts`

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

const RETRYABLE_ERRORS = [
  "timeout", "ECONNRESET", "ETIMEDOUT",
  "rate_limit_exceeded", "server_error", "service_unavailable",
];

export async function withRetry<T>(
  fn: () => Promise<T>,
  config = DEFAULT_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message.toLowerCase();
      const isRetryable = RETRYABLE_ERRORS.some(e => msg.includes(e));
      
      if (attempt < config.maxAttempts && isRetryable) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt - 1),
          config.maxDelayMs
        );
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
}
```

### Task 2.3: Create OpenAI Provider

**File**: `convex/lib/ai/providers/openai.ts`

```typescript
import OpenAI from "openai";
import { AIProvider, ReportSuggestionInput, ReportSuggestionOutput } from "./types";
import { reportSuggestionPrompt } from "../prompts/reportSuggestion";
import { withRetry } from "../retry";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  model = "gpt-5-mini";
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateReportSuggestion(input: ReportSuggestionInput): Promise<ReportSuggestionOutput> {
    const prompt = reportSuggestionPrompt(input);
    
    const response = await withRetry(() =>
      this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1500,
        // Note: temperature NOT supported in gpt-5-mini
      })
    );
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");
    
    return JSON.parse(content);
  }
}
```

### Task 2.4: Create Factory Function

**File**: `convex/lib/ai/providers/index.ts`

```typescript
import { AIProvider } from "./types";
import { OpenAIProvider } from "./openai";

const providers: Record<string, () => AIProvider> = {
  openai: () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    return new OpenAIProvider(apiKey);
  },
};

export function getAIProvider(name: "openai" = "openai"): AIProvider {
  const factory = providers[name];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${name}`);
  }
  return factory();
}

export * from "./types";
```

### Task 2.5: Create Zod Validation Schema

**File**: `convex/lib/ai/schemas/reportSuggestion.ts`

```typescript
import { z } from "zod";

export const StructuredRestrictionSchema = z.object({
  code: z.string().regex(/^[A-Z]{2}-\d{2}$/, "Code must be format XX-00"),
  category: z.enum(["manual_handling", "ergonomic", "environmental", "time", "other"]),
  description: z.string().min(5).max(200),
  duration: z.string().optional(),
});

export const ReportSuggestionOutputSchema = z.object({
  fitForWork: z.enum(["fit", "fit_with_restrictions", "temporarily_unfit", "needs_further_assessment"]),
  summary: z.string().min(20).max(1000),
  restrictions: z.array(StructuredRestrictionSchema).max(10),
  followUpRequired: z.boolean(),
  followUpNotes: z.string().max(500).optional(),
  confidence: z.number().min(0).max(1),
});

export type ReportSuggestionOutput = z.infer<typeof ReportSuggestionOutputSchema>;

export function validateAIResponse(response: unknown): ReportSuggestionOutput {
  return ReportSuggestionOutputSchema.parse(response);
}
```

### Task 2.6: Create Facade Index

**File**: `convex/lib/ai/index.ts`

```typescript
// Facade exports for convex/lib/ai module
export { getAIProvider } from "./providers";
export type { AIProvider, ReportSuggestionInput, ReportSuggestionOutput, StructuredRestriction } from "./providers/types";
export { withRetry } from "./retry";
export { reportSuggestionPrompt } from "./prompts/reportSuggestion";
export { validateAIResponse, ReportSuggestionOutputSchema } from "./schemas/reportSuggestion";
```

### Task 2.7: Create Prompt Templates

**File**: `convex/lib/ai/prompts/reportSuggestion.ts`

```typescript
import { ReportSuggestionInput } from "../providers/types";

export function reportSuggestionPrompt(input: ReportSuggestionInput) {
  const system = `You are an occupational health report assistant. Generate fitness-for-work assessments.

Return valid JSON with this structure:
{
  "fitForWork": "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment",
  "summary": "2-3 sentences, employer-appropriate, no diagnoses",
  "restrictions": [{ "code": "ER-01", "category": "ergonomic", "description": "...", "duration": "2 weeks" }],
  "followUpRequired": boolean,
  "followUpNotes": "string or null",
  "confidence": 0-1
}

Guidelines:
- Summary is for employer viewing - no sensitive medical details
- Use standard restriction codes when applicable (MH-01 to MH-05 for manual handling, ER-01 to ER-05 for ergonomic)
- Be conservative - when in doubt, recommend restrictions`;

  const user = `Clinical Findings: ${input.clinicalFindings}
${input.diagnosis ? `Diagnosis: ${input.diagnosis}` : ""}
Appointment Type: ${input.appointmentType}
${input.reasonForAppointment ? `Reason: ${input.reasonForAppointment}` : ""}
${input.patientJobTitle ? `Job: ${input.patientJobTitle}` : ""}
${input.patientDepartment ? `Department: ${input.patientDepartment}` : ""}
${input.patientAge ? `Age: ${input.patientAge}` : ""}`;

  return { system, user };
}
```

## Acceptance Criteria

- [ ] `convex/lib/ai/providers/types.ts` created with interfaces
- [ ] `convex/lib/ai/retry.ts` created with withRetry function
- [ ] `convex/lib/ai/providers/openai.ts` created and working
- [ ] `convex/lib/ai/providers/index.ts` created with `getAIProvider()` factory
- [ ] `convex/lib/ai/schemas/reportSuggestion.ts` created with Zod validation
- [ ] `convex/lib/ai/prompts/reportSuggestion.ts` created
- [ ] `convex/lib/ai/index.ts` facade exports all public API
- [ ] All files follow project code conventions

## Verification

```bash
# Typecheck passes
npm run typecheck

# Files exist
ls -la convex/lib/ai/
```

---

→ Next: AI_REPORT_GEN_SPRINT_03_ACTION
