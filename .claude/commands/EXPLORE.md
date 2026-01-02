# CODEBASE EXPLORATION - EXPLORE AGENT PARALLEL BATCH ANALYSIS

 **DEEP ANALYSIS with 100% content & coverage using 3 sequential batches of 4 parallel agents (12 total) with `Task` tool to analyse [$ARGUMENTS] presented as - (directory path, file pattern, previous image analysis or query)**

 **Agent Strategy**: Explore (haiku) for fast discovery/verification → analysis (Opus) for deep investigation → Explore (haiku) for cross-validation.

 **IMPORTANT** - Always delegate to subagents with `Task` tool! Never Edit or Write code! Only analysis & presentation!

 ---

## **STEP 0: CLARIFICATION**

On submission of [$ARGUMENTS] by user `AskUserQuestion` to clarify scope & purpose of analysis/exploration (Don't just assume or randomly explore before launching subagents!)

 ## **STEP 1: DISCOVERY**

 Launch 4 `Explore` agents (haiku) **in parallel** (single message, multiple `Task` tool calls):

 ### Agent 1: Directory Structure & Inventory
 Explore $ARGUMENTS with 100% coverage.

 DISCOVERY MISSION: Map complete directory structure and file inventory.

 1. List ALL files and directories recursively
 2. Categorize files by purpose (scripts, features, schemas, configs)
 3. Identify file sizes and line counts
 4. Note any unusual or unexpected files

 Output: Complete inventory with file paths and descriptions.

 ### Agent 2: Entry Points & Architecture
 Explore $ARGUMENTS with 100% coverage.

 DISCOVERY MISSION: Identify all entry points and architectural patterns.

 1. Find main entry points (index files, CLI scripts, servers)
 2. Map command/data flow from entry to handlers
 3. Identify initialization and lifecycle patterns
 4. Document protocols and interfaces

 Output: Architecture diagram (ASCII) showing data flow and components.

 ### Agent 3: Module/Feature System
 Explore $ARGUMENTS with 100% coverage.

 DISCOVERY MISSION: Map the complete module/feature system.

 1. Identify all modules/features/components
 2. Document public interfaces and exports
 3. Map dependencies between modules
 4. Identify lifecycle hooks and extension points

 Output: Feature catalog with purposes, commands, and dependencies.

 ### Agent 4: Dependencies & External Integrations
 Explore $ARGUMENTS with 100% coverage.

 DISCOVERY MISSION: Map all external dependencies and integrations.

 1. Identify third-party libraries and their usage
 2. Map external API integrations and endpoints
 3. Document configuration files and environment variables
 4. Identify build tools, bundlers, and dev dependencies

 Output: Dependency graph, external integration map, config inventory.

 **GATE**: Wait for all 4 agents to complete before Batch 2.

 ---

 ## **STEP 2: DEEP DISCOVERY**

 Launch 4 `Analysis` agents (Opus) **in parallel** based on Batch 1 findings:

 ### Agent 5: Error Handling & Edge Cases
 Deep dive into $ARGUMENTS error handling with 100% coverage.

 Based on Batch 1 findings, analyze:
 1. Error patterns and retry mechanisms
 2. Edge case handling
 3. Validation and input sanitization
 4. Recovery suggestions and fallbacks

 Output: Error taxonomy, retry details, improvement opportunities.

 ### Agent 6: Extension/Plugin Points
 Deep dive into $ARGUMENTS extensibility with 100% coverage.

 Based on Batch 1 findings, analyze:
 1. Plugin/extension system architecture
 2. API contracts and interfaces
 3. Lifecycle hooks (init, cleanup)
 4. Validation and security model

 Output: Extension API specification, validation rules, gaps.

 ### Agent 7: Testing & Quality Patterns
 Deep dive into $ARGUMENTS testing infrastructure with 100% coverage.

 Based on Batch 1 findings, analyze:
 1. Test files and coverage
 2. Test execution and orchestration
 3. Quality patterns (linting, types)
 4. CI/CD integration points

 Output: Testing architecture, coverage gaps, improvement areas.

 ### Agent 8: Performance & Optimization Patterns
 Deep dive into $ARGUMENTS performance characteristics with 100% coverage.

 Based on Batch 1 findings, analyze:
 1. Caching strategies and memoization
 2. Async patterns and concurrency handling
 3. Memory usage and potential leaks
 4. Bottlenecks and optimization opportunities

 Output: Performance profile, bottleneck inventory, optimization recommendations.

 **GATE**: Wait for all 4 agents to complete before Batch 3.

 ---

 ## **STEP 3: CROSS VERIFICATION**

 Launch 4 `Explore` agents (haiku) **in parallel** to validate findings:

 ### Agent 9: Validate Architecture Claims
 Cross-verify $ARGUMENTS architecture with 100% coverage.

 Verify claims from Batches 1-2:
 1. Confirm file counts and line counts
 2. Verify feature/module counts
 3. Validate dependency graph (no orphans)
 4. Check for unused or dead code

 Output: Verification status, corrections, dependency graph.

 ### Agent 10: Check Parity & Consistency
 Cross-verify $ARGUMENTS consistency with 100% coverage.

 Check parity across systems:
 1. Parser/formatter alignment
 2. Help text coverage for all commands
 3. Error handling consistency
 4. Naming convention adherence

 Output: Parity check results, inconsistencies found.

 ### Agent 11: Documentation & Completeness
 Cross-verify $ARGUMENTS documentation with 100% coverage.

 Verify documentation completeness:
 1. Compare documented vs implemented features
 2. Identify undocumented commands/APIs
 3. Check example validity
 4. Assess documentation gaps

 Output: Documentation coverage %, gaps list, priorities.

 ### Agent 12: Security & Compliance Verification
 Cross-verify $ARGUMENTS security posture with 100% coverage.

 Verify security patterns:
 1. Secrets handling and environment variable usage
 2. Authentication and authorization patterns
 3. Input validation and sanitization
 4. Potential vulnerability patterns (injection, XSS, etc.)

 Output: Security assessment, vulnerability inventory, remediation priorities.

 **GATE**: Wait for all 4 agents to complete before Synthesis.

 ---

 ## **STEP 4: SYNTHESIS**

 Parent consolidates all 12 agent findings into:

 1. Executive Summary
 - Architecture score (1-10)
 - Key metrics (files, LOC, features, commands)
 - Overall assessment

 2. Architecture Diagram
 ASCII diagram showing:
 - Entry points
 - Core components
 - Data flow
 - Extension points

 3. Findings by Category
 | Category | Status | Key Findings |
 |----------|--------|--------------|
 | Core Infrastructure | ✅/⚠️/❌ | Summary |
 | Dependencies | ✅/⚠️/❌ | Summary |
 | Error Handling | ✅/⚠️/❌ | Summary |
 | Extensibility | ✅/⚠️/❌ | Summary |
 | Testing | ✅/⚠️/❌ | Summary |
 | Performance | ✅/⚠️/❌ | Summary |
 | Documentation | ✅/⚠️/❌ | Summary |
 | Security | ✅/⚠️/❌ | Summary |

 4. Improvement Opportunities
 | Priority | Issue | Impact | Recommendation |
 |----------|-------|--------|----------------|
 | HIGH | ... | ... | ... |
 | MEDIUM | ... | ... | ... |
 | LOW | ... | ... | ... |

 5. Present Findings & Recommended Next Steps
- Create wireframe diagram of what you have analysed/discovered
- Create source tree stemming from feature, files associated, dependencies and respective sizes in lines
- Explain in detail what you have discovered related to in terms of function/use case
- Present conclusion in concise but detailed manner
- Prioritized action items based on findings.

 ---

 ## EXECUTION FLOW

 ┌─────────────────────────────────────────────────────────────────┐
 │  BATCH 1: DISCOVERY (4 parallel Explore agents - haiku)         │
 │  ├── Agent 1: Directory structure & file inventory              │
 │  ├── Agent 2: Entry points & architecture overview              │
 │  ├── Agent 3: Module/feature system mapping                     │
 │  └── Agent 4: Dependencies & external integrations              │
 │      ▼ [Wait for all 4]                                         │
 │                                                                 │
 │  BATCH 2: DEEP DISCOVERY (4 parallel Analysis agents - Opus)    │
 │  ├── Agent 5: Error handling & edge cases                       │
 │  ├── Agent 6: Extension/plugin points                           │
 │  ├── Agent 7: Testing & quality patterns                        │
 │  └── Agent 8: Performance & optimization patterns               │
 │      ▼ [Wait for all 4]                                         │
 │                                                                 │
 │  BATCH 3: CROSS VERIFICATION (4 parallel Explore agents - haiku)│
 │  ├── Agent 9: Validate architecture claims                      │
 │  ├── Agent 10: Check parity & consistency                       │
 │  ├── Agent 11: Documentation & completeness gaps                │
 │  └── Agent 12: Security & compliance verification               │
 │      ▼ [Wait for all 4]                                         │
 │                                                                 │
 │  SYNTHESIS: Parent consolidates findings                        │
 └─────────────────────────────────────────────────────────────────┘

 ## **IMPORTANT/CRITICAL RULES**

 1. **Do NOT run agents in background** - Wait for each batch to complete
 2. **Do not perform search/scoping yourself!** - Always delegate to subagents!
 2. **Launch 4 agents per batch in SINGLE message** - Parallel execution
 3. **100% coverage** - Read files completely, do not skim
 4. **Evidence-based** - Include file:line references
 5. **Synthesize as parent** - Consolidate all findings before presenting
 6. **Always run all 3 batches** - Don't skip any phases
 7. **Determine scope & purpose** - Always `AskUserQuestion`
 8. **Never Implement Changes** - No write or edits only analysis, synthesis & presentation only
