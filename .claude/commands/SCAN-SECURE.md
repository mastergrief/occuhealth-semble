# DEEP SECURITY SCAN - AGENTIC PARALLEL ANALYSIS

**SECURITY-FOCUSED SEQUENTIAL PIPELINE using 5 agents across 3 phases (2→2→1) set to thoroughness level `very thorough` with `Task` tool to analyse [$ARGUMENTS] (directory path, file pattern, or query) — each phase builds on prior findings for compounding context**

**Agent Strategy**: 3-phase sequential pipeline — Phase 1: 1x `Explore` `opus` + 1x `data` `opus` in parallel (attack surface inventory + auth/config/env diagnosis) → Phase 2: 2x `Explore` `opus` in parallel (auth & injection analysis + data exposure & infrastructure) → Phase 3: 1x `Explore` `opus` (cross-validation). Each phase receives synthesized prior findings as context. All agents set to thoroughness level `very thorough`.

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never `Edit` or `Write` code! Only analysis & presentation! Execute phases SEQUENTIALLY — each phase MUST complete before the next launches!

> **Why sequential?** Parallel scans launch all agents blind to each other. This pipeline compounds context: Phase 1 maps the attack surface and config state → Phase 2 deep-analyses pre-scoped security vectors → Phase 3 cross-validates real findings. Same 5 agents, better results.

> **Sibling scans** for other concerns: `SCAN-TARGET` (bug hunting), `SCAN-IMPLEMENTATION` (pre-implementation), `SCAN-DOCS` (documentation accuracy), `SCAN-DATA` (data flow & integrity), `SCAN-FUNCTIONAL` (workflows & UX)

**4-Phase Analysis workflow for `Explore` agents**:
1. Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools → `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

---

## **STEP 0**: On submission of [$ARGUMENTS] by user `AskUserQuestion` to clarify scope & purpose of analysis/exploration (Don't just assume or randomly explore before launching subagents!)

```
AskUserQuestion:
  questions:
    - question: "What's the security audit goal?"
      header: "Goal"
      options:
        - label: "Full OWASP security audit (Recommended)"
          description: "All 5 agents — auth, injection, data exposure, infrastructure, secrets"
        - label: "Auth & access control"
          description: "Focus on authentication, authorization, role checks, identity validation"
        - label: "Injection & input validation"
          description: "XSS, prompt injection, SQL injection, URL manipulation, unsanitized input"
        - label: "Data exposure & secrets"
          description: "Over-fetched data, leaked PII, exposed env vars, client-reachable secrets"
      multiSelect: false

    - question: "Any specific security concerns?"
      header: "Concerns"
      options:
        - label: "None - general audit"
          description: "Let agents find what's important across all OWASP categories"
        - label: "Auth bypass vectors"
          description: "Missing identity checks, role escalation, direct mutation access"
        - label: "Input sanitization gaps"
          description: "Unsanitized user input reaching innerHTML, AI prompts, DB queries, URLs"
        - label: "Rate limiting & abuse"
          description: "Missing rate limits, API abuse vectors, resource exhaustion"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "OWASP Top 10 coverage, verify all auth patterns, spot-check inputs"
        - label: "Quick scan"
          description: "High-level attack surface only, critical vulnerabilities"
        - label: "Deep dive"
          description: "Exhaustive analysis — every mutation, every input, every data path"
      multiSelect: false
```

---

## **STEP 1: Execute Phases**

### **Phase 1 — Discovery (parallel: 1x `Explore` opus + 1x `data` opus)**

Launch BOTH agents in a **single message** with two `Task` tool calls:

**Agent 1a — `Explore` opus (Attack Surface Inventory)**:
```
Map the attack surface for [$ARGUMENTS] using 4-phase workflow (Discovery → Locate → Understand → Validate).
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

Search targets:
- rg "ctx\.auth|getIdentity|getUserIdentity" -g "convex/**/*.ts" -C 2       # Auth check patterns
- rg "mutation|action|query" -g "convex/**/*.ts" -l                          # All Convex endpoints
- rg "dangerouslySetInnerHTML|innerHTML" -g "*.tsx" -C 2                     # XSS vectors
- rg "\.env|API_KEY|SECRET|TOKEN|PASSWORD" -g "**/*.ts" -C 1                # Secret references
- rg "href=|window\.location|navigate\(" -g "src/**/*.tsx" -C 1             # URL manipulation
- rg "generateContent|generateText|prompt" -g "convex/**/*.ts" -C 2         # AI prompt injection surface
- wc -l convex/**/*.ts src/**/*.tsx                                          # File sizes

Deliverables (use STRUCTURED OUTPUT FORMAT below):
- File inventory with `wc -l` line counts for all backend/frontend files in scope
- All Convex mutations/actions/queries — which have auth checks, which don't
- All user input entry points (forms, URL params, search boxes)
- All external API call sites (AI, third-party)
- Initial vulnerability candidates with file:line references

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Vector | Type | Evidence | Category |
|----------|-----------|--------|------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description of attack vector | auth/xss/injection/exposure/config | Code snippet or reference | OWASP category |
```

**Agent 1b — `data` opus (Auth & Config Diagnosis)**:
```
Diagnose authentication configuration, environment security, and access control state for [$ARGUMENTS]. Diagnostic only — no modifications.

Search targets:
- rg "GEMINI_API_KEY|OPENAI|CONVEX_" -g ".env.local" -g ".env.prod" -C 0   # Actual env vars (dev + prod ref)
- rg "VITE_" -g ".env.local" -g ".env.prod" -C 0                           # Client-exposed env vars (dev + prod ref)
- rg "rateLimit|throttle|RateLimiter" -g "convex/**/*.ts" -C 2              # Rate limiting
- rg "cors|Access-Control|allowedOrigins" -g "**/*.ts" -C 2                 # CORS config
- rg "httpAction|httpRouter" -g "convex/**/*.ts" -C 2                       # HTTP endpoints (public)
- npx convex functions 2>/dev/null | head -30                                # Deployed function list
- npx convex env list 2>/dev/null                                            # Dev env var names (not values)

Deliverables:
- Which env vars are VITE_ prefixed (client-exposed) vs server-only
- Rate limiting coverage: which mutations/actions have limits, which don't
- CORS configuration: restrictive or permissive
- HTTP actions: public endpoints without auth gates
- Convex function permissions: any functions missing auth checks

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | Area | Issue | Evidence | Category |
|----------|------|-------|----------|----------|
| CRITICAL/HIGH/MEDIUM/LOW | auth/env/rate-limit/cors/http | Description | Config value or sample | access-control/secrets/abuse/infrastructure |
```

**Wait for both to complete.** Synthesize key findings into a bullet list (max 20 items) before proceeding.

### **Phase 2 — Deep Analysis (parallel: 2x `Explore` opus)**

Launch BOTH agents in a **single message**. Include **synthesized Phase 1 findings** (not raw output):

**Agent 2a — `Explore` opus (Auth & Injection Analysis)**:
```
Deep analysis of authentication, authorization, and injection vectors for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- rg "ctx\.auth\.getUserIdentity" -g "convex/**/*.ts" -C 5                  # Auth check implementations
- rg "mutation\(\{" -g "convex/**/*.ts" -C 10                               # Mutation handlers (check auth)
- rg "action\(\{" -g "convex/**/*.ts" -C 10                                 # Action handlers (check auth)
- rg "dangerouslySetInnerHTML|innerHTML|outerHTML" -g "src/**/*.tsx" -C 3    # XSS sinks
- rg "eval\(|Function\(|new Function" -g "**/*.ts" -C 2                     # Code injection
- rg "generateContent|parts.*text" -g "convex/**/*.ts" -C 5                 # AI prompt construction
- rg "v\.string\(\)|v\.any\(\)" -g "convex/**/*.ts" -C 2                    # Weak input validators

Focus:
1. Every mutation/action — does it call `ctx.auth.getUserIdentity()` and reject if null?
2. Role-based access — do coach-only functions verify coach role, not just identity?
3. Input validation — are Convex validators strict (v.string() with limits) or permissive (v.any())?
4. AI prompt injection — is user input concatenated directly into prompts without sanitization?
5. XSS — any user-controlled data rendered with dangerouslySetInnerHTML?
6. URL manipulation — can users craft URLs to access unauthorized resources?

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Vulnerability | Attack Scenario | Evidence | OWASP Category |
|----------|-----------|--------------|-----------------|----------|----------------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Description | How an attacker exploits this | Code snippet | A01-A10 reference |
```

**Agent 2b — `Explore` opus (Data Exposure & Infrastructure)**:
```
Deep analysis of data exposure, secrets management, and infrastructure security for [$ARGUMENTS] using 4-phase workflow.
Goal: [$GOAL] | Concerns: [$CONCERNS] | Depth: [$DEPTH]

PHASE 1 KEY FINDINGS:
[$SYNTHESIZED_PHASE_1_BULLETS]

Search targets:
- rg "return.*\{" -g "convex/**/*queries*.ts" -C 5                          # Query return shapes (over-fetch)
- rg "console\.log|console\.error" -g "convex/**/*.ts" -C 2                 # Logged sensitive data
- rg "process\.env\." -g "convex/**/*.ts" -C 2                              # Server-side env access
- rg "VITE_" -g "src/**/*.ts{,x}" -C 1                                      # Client-side env usage
- rg "storage\.getUrl|storageId" -g "convex/**/*.ts" -C 2                   # File storage access control
- rg "httpAction|httpRouter" -g "convex/**/*.ts" -C 5                       # Public HTTP endpoints
- rg "\.index\(|\.searchIndex\(" -g "convex/schema.ts" -C 2                 # Index definitions (query efficiency)

Focus:
1. Over-fetching — do queries return more fields than the UI needs (passwords, tokens, internal IDs)?
2. PII in logs — is user data (email, name, health metrics) logged to console?
3. Client-exposed secrets — are any non-VITE_ secrets accidentally bundled?
4. File storage — can unauthenticated users access stored files via URL?
5. HTTP endpoints — are public HTTP actions properly gated?
6. Error messages — do catch blocks leak stack traces or internal details to clients?

STRUCTURED OUTPUT FORMAT — return findings as:
| Severity | File:Line | Exposure | Data At Risk | Client-Reachable? | OWASP Category |
|----------|-----------|---------|-------------|-------------------|----------------|
| CRITICAL/HIGH/MEDIUM/LOW | path:line | Over-fetch/log/leak/config | What data is exposed | Yes/No | A01-A10 reference |
```

**Wait for both to complete.** Synthesize all findings (Phase 1 + Phase 2) into consolidated bullet list before proceeding.

### **Phase 3 — Cross-Validation (1x `Explore` opus)**

Launch **single agent** with ALL synthesized findings:

**Agent 3 — `Explore` opus (Cross-Validator)**:
```
Cross-validate and verify security findings for [$ARGUMENTS].
DO NOT re-discover — only confirm, contradict, or extend existing findings.

ALL PRIOR FINDINGS:
[$SYNTHESIZED_ALL_PHASES_BULLETS]

Tasks:
1. Verify top 5 critical/high findings — read symbol bodies to confirm exploitability
2. Check for contradictions between Phase 2a and 2b findings
3. Assess real-world exploitability — distinguish theoretical vs practical risk
4. Identify gaps — any OWASP categories not covered?
5. Rate confidence (HIGH/MEDIUM/LOW) for each finding
6. Check if existing mitigations (middleware, validators, auth wrappers) cover flagged issues

STRUCTURED OUTPUT FORMAT — return as:
| Original Finding | Verdict | Exploitability | Confidence | Notes |
|------------------|---------|---------------|------------|-------|
| [from prior phases] | CONFIRMED/CONTRADICTED/EXTENDED/MITIGATED | PRACTICAL/THEORETICAL | HIGH/MEDIUM/LOW | Additional evidence, existing mitigations, or correction |
```

---

## **Phase Specializations**

**Phase 1a — Attack Surface Inventory** (`Explore` opus):
Broad inventory of all endpoints, input entry points, auth patterns, external API calls. Maps the attack surface. Output scopes Phase 2.

**Phase 1b — Auth & Config Diagnosis** (`data` opus):
Environment variables, rate limiting, CORS, HTTP endpoints, Convex function permissions. Identifies infrastructure-level security gaps. Diagnostic only — no modifications.

**Phase 2a — Auth & Injection Analysis** (`Explore` opus):
Receives synthesized Phase 1 findings. Deep-checks every mutation/action for auth, validates input sanitization, traces injection vectors through AI prompts and DOM rendering.

**Phase 2b — Data Exposure & Infrastructure** (`Explore` opus):
Receives synthesized Phase 1 findings. Audits query return shapes for over-fetching, checks for logged PII, validates secrets management, reviews file storage access control.

**Phase 3 — Cross-Validation & Verification** (`Explore` opus):
Receives ALL synthesized findings. Confirms exploitability, identifies mitigations already in place, rates practical vs theoretical risk. Never re-discovers.

---

## **STEP 2**: Present Findings

On completion of all phases, synthesize and present:
- **Attack surface diagram** (ASCII: endpoints, input paths, auth gates, data flow with security annotations)
- **Source tree** of analysed files with line counts and security-relevant annotations
- **Detailed explanation** of discoveries in terms of exploit scenarios and impact
- **Concise conclusion** with confidence ratings from Phase 3

### Findings Tables

**RECOMMENDED SECURITY FIXES — COMPREHENSIVE**
| Priority | Issue | File:Line | Impact | Confidence | Recommendation |
|----------|-------|-----------|--------|------------|----------------|
| CRITICAL | ... | ... | ... | HIGH/MED/LOW | ... |
| HIGH | ... | ... | ... | HIGH/MED/LOW | ... |
| MEDIUM | ... | ... | ... | HIGH/MED/LOW | ... |
| LOW | ... | ... | ... | HIGH/MED/LOW | ... |

**A. AUTH & ACCESS CONTROL**
| Function | File:Line | Auth Check | Gap | Exploit Scenario |
|----------|-----------|-----------|-----|-----------------|
| ... | ... | None/Partial/Full | Missing identity check | Direct mutation call bypasses UI |

**B. INJECTION VECTORS**
| Type | File:Line | Input Source | Sink | Sanitization | Severity |
|------|-----------|-------------|------|-------------|----------|
| XSS/Prompt injection/URL | ... | User input / DB field | innerHTML / AI prompt / href | None/Partial | CRITICAL/HIGH/MED |

**C. DATA EXPOSURE**
| Exposure Type | File:Line | Data Exposed | Client-Reachable? | Severity |
|--------------|-----------|-------------|-------------------|----------|
| Over-fetch / Logged PII / Leaked secret | ... | ... | Yes/No | ... |

**D. INFRASTRUCTURE & CONFIG**
| Area | File:Line | Misconfiguration | Exploit Scenario | Severity |
|------|-----------|-----------------|-----------------|----------|
| CORS / Rate limit / File storage / Debug flag | ... | ... | ... | ... |

**E. SEVERITY SUMMARY**
| Severity | Count | Top Priority Fix |
|----------|-------|-----------------|
| CRITICAL | ... | ... |
| HIGH | ... | ... |
| MEDIUM | ... | ... |
| LOW | ... | ... |

---

## **CRITICAL RULES**

1. **Do NOT run agents in background** — Wait for ALL agents in each phase to complete before proceeding
2. **Phases are SEQUENTIAL** — Phase 1 must complete before Phase 2 launches, Phase 2 must complete before Phase 3 launches
3. **Phase 1 agents launch in parallel** — `Explore` opus + `data` opus in a SINGLE message
4. **Phase 2 agents launch in parallel** — Both `opus` agents in a SINGLE message, but only after Phase 1 completes
5. **Synthesized context injection** — Every phase prompt includes synthesized key findings (max 20 bullets) from prior phases, not raw output
6. **Very thorough for ALL agents** — Comprehensive analysis set to thoroughness level `very thorough`
7. **All agents use opus** — Phase 1 `opus` + `opus` (deep discovery) → Phase 2 `opus` + `opus` (deep analysis) → Phase 3 `opus` (cross-validation)
8. **100% coverage** — Read files completely, do not skim
9. **Evidence-based** — Include file:line references in ALL findings
10. **Determine scope & purpose** — Always `AskUserQuestion` first
11. **Never implement changes** — Analysis & presentation only
12. **Do not search yourself** — Always delegate to subagents
13. **4-phase workflow per agent** — Each agent internally follows Discovery → Locate → Understand → Validate
14. **Phase 1 output is the contract** — If Phase 1 output is incomplete, note gaps explicitly before launching Phase 2
15. **Phase 3 validates, not re-discovers** — Cross-validation agent confirms, contradicts, or extends — never repeats
16. **Exact counts** — Use `wc -l` for line counts, never estimate or round
17. **Structured output format** — ALL agents return findings in the specified table format for consistent synthesis
18. **Orchestrator synthesizes between phases** — Deduplicate and consolidate before injecting into next phase
19. **OWASP mapping** — Every finding must reference an OWASP Top 10 category (A01-A10)
20. **Exploitability assessment** — Distinguish practical (attacker can reach) from theoretical (requires internal access) risk
21. **Security-specific search patterns** — Agents must use the provided security-focused rg patterns, not generic code search
