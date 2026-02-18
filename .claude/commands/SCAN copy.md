# CODEBASE SCAN - AGENTIC PARALLEL ANALYSIS

**DEEP ANALYSIS/SCAN with 100% content & coverage using 1 batch (4 total) of `Explore` agents set to throughoughness level `very thorough` spawned with `Task` tool in parallel to analyse [$ARGUMENTS] presented as - (directory path, file pattern, previous image analysis or query)**

**Agent Strategy**: IN SINGLE CALL 4x `Explore` agents in parallel set to thoroughness level  `very thorough` level for discovery & structure `haiku` →  data flow `opus` → deep investigation `opus` → cross-validation `haiku`

**IMPORTANT** - Always delegate to subagents with `Task` tool! Never Edit or Write code! ALWAYS SPAWN SUBAGENTS IN PARALLEL! Only analysis & presentation!

**4-Phase Analysis workflow for `Explore` agents**: 
1. Discovery (rg commands) - `wc -l` for ALL counts - exact numbers, never estimate, `rg -l` "pattern" → list files only, `rg -c` "pattern" | `sort -nr` → density hotspots `rg -C 2` → context preview (Find candidate files, measure density)
2. Locate (Structure without bodies) - `get_symbols_overview`, `find_symbol(body=False)` → see all exports/classes/functions, `depth=1` → map class methods without reading them
3. Understand (Surgical reads) - `find_symbol(body=True)`, `find_referencing_symbols` → Read specific symbol bodies one at a time, Trace references only when critical, Stop when you have enough
4. Validate (Mandatory checkpoints) - `think_about_*` tools →  `think_about_collected_information()` after searches, `think_about_task_adherence()` before edits, Loop back if gaps found

**STEP 0**: On submission of [$ARGUMENTS] by user `AskUserQuestion` to clarify scope & purpose of analysis/exploration (Don't just assume or randomly explore before launching subagents!)

```
AskUserQuestion:
  questions:
    - question: "What's the exploration goal?"
      header: "Goal"
      options:
        - label: "Full exploration"
          description: "Complete codebase analysis - architecture, data flow, quality, security"
        - label: "Architecture review"
          description: "Focus on structure, modules, dependencies, patterns"
        - label: "Bug hunting"
          description: "Find potential bugs, edge cases, error handling gaps"
        - label: "Security audit"
          description: "OWASP-focused security analysis"
        - label: "PreImplementation analysis"
          description: "Understand architecture, structure, entry points, data flow, dependencies, integrations, functional workflows, edge cases, error handling before making changes"
      multiSelect: false

    - question: "Any specific concerns to investigate?"
      header: "Concerns"
      options:
        - label: "None - general analysis"
          description: "Let agents find what's important"
        - label: "Performance issues"
          description: "Caching, re-renders, memory leaks, bottlenecks"
        - label: "Type safety"
          description: "Type errors, any casts, missing validations"
        - label: "Test coverage"
          description: "Untested code, missing edge cases"
      multiSelect: true

    - question: "Depth level?"
      header: "Depth"
      options:
        - label: "Standard (Recommended)"
          description: "Balanced analysis - good coverage without excessive detail"
        - label: "Quick scan"
          description: "High-level overview, major issues only"
        - label: "Deep dive"
          description: "Exhaustive analysis, all findings regardless of severity"
      multiSelect: false
```

### Start Session

---

### **STEP 2**: Present Findings & Recommended Next Steps
On completion of comprehensive analysis and discovery:
- Create wireframe diagram of what you have analysed/discovered
- Create source tree stemming from feature, files associated, dependencies and respective sizes in lines
- Explain in detail what you have discovered related to in terms of function/use case
- Present conclusion in concise but detailed manner
- Prioritized action items based on findings:
**Improvement Opportunities - COMPREHENSIVE**:
1. **DATA FLOW + DATA INTEGRITY**
 | Priority | Issue | Impact | Recommendation |
 |----------|-------|--------|----------------|
 | HIGH | ... | ... | ... |
 | MEDIUM | ... | ... | ... |
 | LOW | ... | ... | ... |
2. **FUNCTIONAL WORKFLOW IMPROVEMENTS**
 | Priority | Issue | Impact | Recommendation |
 |----------|-------|--------|----------------|
 | HIGH | ... | ... | ... |
 | MEDIUM | ... | ... | ... |
 | LOW | ... | ... | ... |
 3. **SECURITY**
| Priority | Issue | Impact | Recommendation |
 |----------|-------|--------|----------------|
 | HIGH | ... | ... | ... |
 | MEDIUM | ... | ... | ... |
 | LOW | ... | ... | ... |
 ---

### **CRITICAL RULES**

1. **Do NOT run agents in background** - Wait for all agents to complete!
2. **Launch all agents for in SINGLE message** - Parallel execution, ALWAYS SPAWN SUBAGENTS IN PARALLEL!
3. **Very thorough for ALL agents** - Comprehensive analysis regardless of model
4. **ESCALATING MODELS** - Discovery `haiku` →  Data flow `opus` → Deep investigation `opus` → cross-validation `haiku`
4. **100% coverage** - Read files completely, do not skim
5. **Evidence-based** - Include file:line references in findings
6. **Always run agents in parallel** - Don't skip any phases
7. **Determine scope & purpose** - Always `AskUserQuestion` first
8. **Never Implement Changes** - Analysis & presentation only
9. **Do not perform search/scoping yourself!** - Always delegate to subagents
10. **Always perform 4-phase analysis worflow** - Discovery (rg commands) → Locate (Structure without bodies) → Understand (Surgical reads) →  Validate (Mandatory checkpoints)