# GPT-5 Mini Integration Guide

**Version**: 1.0
**Model**: gpt-5-mini
**Last Updated**: 2026-01-08

---

## Quick Start

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" }
  ],
  response_format: { type: "json_object" },
  max_completion_tokens: 1000,
});

const result = JSON.parse(response.choices[0].message.content);
```

---

## GPT-5 Mini vs GPT-4: Key Differences

| Feature | GPT-4 | GPT-5 Mini |
|---------|-------|------------|
| `temperature` | ✅ Supported (0-2) | ❌ Not supported (uses 1.0) |
| `max_tokens` | ✅ Supported | ❌ Deprecated |
| `max_completion_tokens` | ❌ N/A | ✅ Required |
| `top_p` | ✅ Supported | ❌ Not supported |
| `response_format` | ✅ Supported | ✅ Supported |
| Default reasoning | Basic | Enhanced (chain-of-thought) |

---

## Supported Parameters

```typescript
openai.chat.completions.create({
  // REQUIRED
  model: "gpt-5-mini",
  messages: [...],
  
  // OPTIONAL - Supported
  response_format: { type: "json_object" },  // For structured output
  max_completion_tokens: 4000,               // Output length limit
  
  // ❌ NOT SUPPORTED - Will cause 400 errors
  // temperature: 0.7,    // Don't use
  // max_tokens: 1000,    // Use max_completion_tokens instead
  // top_p: 0.9,          // Don't use
});
```

---

## Environment Setup

```bash
# .env or .env.local
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-5-mini
```

```typescript
// Model selection with fallback
function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-5-mini";
}
```

---

## JSON Response Pattern

GPT-5 mini works best with structured JSON output:

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { 
      role: "system", 
      content: "Return valid JSON only. No markdown, no code blocks." 
    },
    { role: "user", content: prompt }
  ],
  response_format: { type: "json_object" },
});

// Parse response
const data = JSON.parse(response.choices[0].message.content || "{}");
```

---

## Retry Logic (Recommended)

GPT-5 API calls should include retry logic for transient errors:

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
  "timeout",
  "ECONNRESET",
  "ETIMEDOUT",
  "rate_limit_exceeded",
  "server_error",
  "service_unavailable",
];

function isRetryable(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return RETRYABLE_ERRORS.some(e => msg.includes(e));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config = DEFAULT_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < config.maxAttempts && isRetryable(error)) {
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

// Usage
const response = await withRetry(() => 
  openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [...],
  })
);
```

---

## Common Use Cases

### 1. Text Analysis
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { role: "system", content: "Analyze the following text. Return JSON with: sentiment, topics, summary." },
    { role: "user", content: textToAnalyze }
  ],
  response_format: { type: "json_object" },
});
```

### 2. Data Extraction
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { role: "system", content: "Extract structured data. Return JSON matching this schema: { name: string, email: string, items: string[] }" },
    { role: "user", content: rawData }
  ],
  response_format: { type: "json_object" },
});
```

### 3. Content Generation
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { role: "system", content: "You are a content writer. Generate engaging copy." },
    { role: "user", content: "Write a product description for..." }
  ],
  max_completion_tokens: 500,
});
```

### 4. Classification
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [
    { role: "system", content: "Classify input into categories. Return JSON: { category: string, confidence: number }" },
    { role: "user", content: inputText }
  ],
  response_format: { type: "json_object" },
});
```

---

## Error Handling

```typescript
try {
  const response = await openai.chat.completions.create({...});
  const content = response.choices[0].message.content;
  
  if (!content) {
    throw new Error("Empty response from API");
  }
  
  return JSON.parse(content);
  
} catch (error) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 400) {
      // Bad request - check parameters
      console.error("Invalid parameters:", error.message);
    } else if (error.status === 429) {
      // Rate limited - implement backoff
      console.error("Rate limited");
    } else if (error.status >= 500) {
      // Server error - retry
      console.error("Server error:", error.message);
    }
  }
  throw error;
}
```

---

## Token Budgets by Use Case

| Use Case | Recommended max_completion_tokens |
|----------|-----------------------------------|
| Short responses (classification, yes/no) | 100-200 |
| Medium responses (summaries, explanations) | 500-1000 |
| Long responses (articles, reports) | 2000-4000 |
| Complex generation (code, structured data) | 4000-8000 |

---

## Authentication Best Practices

```typescript
// Always validate auth before AI calls
async function callAI(ctx: Context, args: Args) {
  // 1. Check authentication
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  
  // 2. Check authorization (role-based)
  const user = await getUser(ctx, userId);
  if (!user || user.role !== "allowed_role") {
    throw new Error("Not authorized for AI features");
  }
  
  // 3. Rate limiting (optional)
  const recentCalls = await getRecentCalls(ctx, userId);
  if (recentCalls >= HOURLY_LIMIT) {
    throw new Error("Rate limit exceeded");
  }
  
  // 4. Make AI call
  const response = await withRetry(() => 
    openai.chat.completions.create({...})
  );
  
  // 5. Log usage
  await logApiCall(ctx, userId);
  
  return response;
}
```

---

## Caching Strategy

```typescript
// Cache AI responses to reduce costs and latency
interface CacheEntry {
  response: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(params: object): string {
  return crypto.createHash("sha256")
    .update(JSON.stringify(params))
    .digest("hex");
}

async function cachedAICall(params: object, ttlMs = 3600000) {
  const key = getCacheKey(params);
  const cached = cache.get(key);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response;
  }
  
  const response = await openai.chat.completions.create(params);
  
  cache.set(key, {
    response,
    expiresAt: Date.now() + ttlMs,
  });
  
  return response;
}
```

---

## Migration from GPT-4

```typescript
// Before (GPT-4)
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [...],
  temperature: 0.7,
  max_tokens: 1000,
});

// After (GPT-5 Mini)
const response = await openai.chat.completions.create({
  model: "gpt-5-mini",
  messages: [...],
  // temperature removed (not supported)
  max_completion_tokens: 1000,  // renamed parameter
  response_format: { type: "json_object" },  // recommended for structured output
});
```

---

## Checklist for New AI Features

- [ ] Use `gpt-5-mini` model (or env var with correct fallback)
- [ ] Remove `temperature` parameter
- [ ] Use `max_completion_tokens` instead of `max_tokens`
- [ ] Add `response_format: { type: "json_object" }` for JSON output
- [ ] Implement retry logic for transient errors
- [ ] Add authentication check before API calls
- [ ] Add rate limiting if needed
- [ ] Consider caching for repeated queries
- [ ] Handle empty/malformed responses gracefully
- [ ] Log API usage for monitoring

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 400 Bad Request | Using `temperature` or `max_tokens` | Remove unsupported params |
| Empty response | No content in choices[0] | Add fallback handling |
| JSON parse error | Response not valid JSON | Use `response_format`, add try/catch |
| Rate limit (429) | Too many requests | Implement exponential backoff |
| Timeout | Slow response | Increase timeout, add retry |

---

## Cost Optimization

1. **Use appropriate token limits** - Don't request more than needed
2. **Cache responses** - Avoid duplicate API calls
3. **Batch requests** - Combine related queries when possible
4. **Use system prompts efficiently** - Keep them concise
5. **Monitor usage** - Track tokens per feature

---

## Resources

- OpenAI API Docs: https://platform.openai.com/docs
- Model pricing: https://openai.com/pricing
- Rate limits: https://platform.openai.com/docs/guides/rate-limits
