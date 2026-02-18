# SESSION HANDOFF — Context Capture for Continuation

You have full context of this conversation. Write a detailed handoff document so your future self can seamlessly continue in a new session.

**Do NOT spawn subagents** — you already have the context, they don't. Subagents only receive the Task prompt, not the conversation history. You are uniquely positioned to write this.

## Steps

1. **Gather ground truth** (reduces hallucination — concrete data, not recall):
   - `git diff --stat` — actual files changed this session
   - `git diff --name-only` — file list for the "Files Modified" section
   - `TaskList` — current task state (pending, in-progress, completed)
   - `mcp__serena__list_memories()` — check for any memories written this session
2. **Reflect** on the full conversation: goal, progress, decisions, blockers
3. **Write** to Serena memory using `mcp__serena__write_memory` with name `SESSION_HANDOFF`
4. **Confirm** to the user what was captured with a brief summary

## Document Structure

Use this exact structure in the memory content:

```markdown
# Session Handoff — [YYYY-MM-DD]

## Goal
What the user was trying to achieve. Be specific — feature name, bug description, etc.

## Completed
- Concrete deliverables with file paths and function names
- Key decisions made and WHY (not just what)
- Any PRs created, branches pushed, deployments done

## In Progress
- Partially complete work — what's done, what remains
- Current state (e.g., "code written but not browser tested")

## Next Steps
1. Ordered by priority
2. Include specific file paths and approach notes
3. Flag any blockers or open questions

## Key Context
- Discoveries, gotchas, or patterns that would save time if known upfront
- Any failed approaches (so future-you doesn't retry them)
- Environment state (dev server running, specific data created, etc.)

## Files Modified (from git diff)
- `path/to/file.ts` — brief description of change
```

## Rules
- **Ground truth first** — git diff and TaskList before writing, never work from memory alone
- **Be specific** — file paths, function names, line numbers where relevant
- **Capture reasoning** — WHY decisions were made, not just WHAT was done
- **Include failures** — failed approaches are as valuable as successes
- **One memory, overwritten** — `SESSION_HANDOFF` is always the name, always overwrites previous
- **No fluff** — every line should help future-you resume faster
