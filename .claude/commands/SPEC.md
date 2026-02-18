# SPEC - COLLABORATIVE SPECIFICATION & PLANNING

**STEP 1 - DEEP ANALYSIS**
On users [$ARGUMENTS]:
- Think about the request, concept or idea deeply, what exactly Is being asked from a product, design or engineering perspective
- Be meticulous — every implication, integration point, and potential pitfall
- Consider scope, dependencies, edge cases, technical constraints
- `think_about_collected_information`
- `think_about_task_adherence`
- NO codebase searching, scoping, or exploration — that happens in a separate execution workflow (e.g. VDD)

**STEP 2 - COLLABORATIVE PLANNING**
Using context from STEP 1:
- Present initial understanding of the request — what you believe is being asked and why
- Identify key decisions that need to be made (architecture, UX, data model, scope boundaries)
- Flag trade-offs, risks, and alternatives for each decision point
- Ask questions via `AskUserQuestion` — work with me to nail down exactly what's needed
- Push back if you have better ideas or see issues with the proposed direction
- Iterate — back and forth dialogue until we converge on a clear, superior plan
- `think_about_task_adherence`

**STEP 3 - PRESENT SPEC**
Using decisions from STEP 2, present the final specification:
- Create structured plan with numbered sections for each distinct concern
- **Scope**: What's in, what's explicitly out
- **Architecture**: Components, data flow, module boundaries
- **Implementation approach**: Ordered steps, dependencies between them
- **Testable assertions**: Concrete pass/fail criteria for validation
- **Risks & mitigations**: Known gotchas and how to handle them
- Reference all decisions made in STEP 2 — nothing left ambiguous
- `think_about_whether_you_are_done`
