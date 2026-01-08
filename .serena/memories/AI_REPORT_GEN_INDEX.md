# AI Report Generation - Sprint Index

**Created**: 2026-01-08
**Updated**: 2026-01-08 (Enhanced with P0/P1 implementation details)
**Total Sprints**: 6
**Total Words**: ~4,200
**Scope**: GPT-5-mini integration for doctor report generation with browser-cli manual testing

---

## Sprint Manifest

| # | Name | Words | Status | Dependencies |
|---|------|-------|--------|--------------|
| 01 | Overview & Prerequisites | ~550 | Pending | None |
| 02 | Backend AI Infrastructure | ~850 | Pending | 01 |
| 03 | Report Generation Action | ~750 | Pending | 02 |
| 04 | Frontend Integration | ~500 | Pending | 03 |
| 05 | Caching & Performance | ~400 | Pending | 03 |
| 06 | Browser-CLI Manual Testing | ~700 | Pending | 04 |

---

## Reading Order

1. **AI_REPORT_GEN_SPRINT_01_OVERVIEW** - Prerequisites checklist, architecture overview
2. **AI_REPORT_GEN_SPRINT_02_BACKEND** - Provider interface, retry logic, OpenAI implementation
3. **AI_REPORT_GEN_SPRINT_03_ACTION** - Convex action, report mutation, clinical notes
4. **AI_REPORT_GEN_SPRINT_04_FRONTEND** - UI components, form integration
5. **AI_REPORT_GEN_SPRINT_05_CACHING** - Cache table, TTL strategy, cleanup cron
6. **AI_REPORT_GEN_SPRINT_06_TESTING** - Browser-CLI test scenarios, evidence collection

---

## Topic Cross-Reference

| Topic | Sprints | Notes |
|-------|---------|-------|
| Prerequisites & Setup | 01 | Schema changes, error codes |
| Schema Migrations | 01, 05 | reports table (01), aiSuggestionCache (05) |
| OpenAI Provider | 02, 03 | Interface (02), action usage (03) |
| Factory Pattern | 02 | getAIProvider() factory function |
| Zod Validation | 02 | ReportSuggestionOutputSchema |
| Retry Logic | 02 | withRetry() exponential backoff |
| Prompt Templates | 02 | Medical report prompt engineering |
| Convex Actions | 03 | Node runtime, internal queries |
| Error Recovery | 03 | Audit logging for failed AI calls |
| Audit Logging | 03, 05 | AI metadata tracking |
| Clinical Notes | 03 | Separate table for sensitive data |
| UI Components | 04 | AISuggestionPanel component |
| Form Integration | 04 | Accept/Edit/Reject workflow |
| Caching | 05 | Restriction suggestion cache |
| Performance Monitoring | 05 | getCacheStats query |
| Saved Auth States | 06 | authenticated-doctor state |
| Browser-CLI Testing | 06 | 8 test scenarios |
| Evidence Collection | 06 | Screenshots, audit log verification |

---

## Quick Start Commands

```bash
# Sprint 01: Install OpenAI
npm install openai

# Sprint 02-05: Typecheck after each
npm run typecheck

# Sprint 06: Run manual tests
npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5175
```

---

## Key Files to Create/Modify

| Sprint | Files |
|--------|-------|
| 01 | `convex/schema.ts` (add aiAssisted/aiAccepted/aiModified to reports), `convex/lib/errorCodes.ts` (extend), `mkdir convex/actions/` |
| 02 | `convex/lib/ai/providers/types.ts`, `convex/lib/ai/providers/openai.ts`, `convex/lib/ai/providers/index.ts` (factory), `convex/lib/ai/schemas/reportSuggestion.ts` (Zod), `convex/lib/ai/retry.ts`, `convex/lib/ai/prompts/reportSuggestion.ts`, `convex/lib/ai/index.ts` (facade) |
| 03 | `convex/aiHelpers.ts` (incl. error recovery), `convex/actions/aiReportSuggestion.ts`, `convex/reports.ts` (extend), `convex/clinicalNotes.ts` |
| 04 | `src/components/doctor/AISuggestionPanel.tsx`, `src/pages/doctor/Reports.tsx` (extend) |
| 05 | `convex/schema.ts` (aiSuggestionCache table), `convex/lib/ai/cache.ts`, `convex/crons.ts` |
| 06 | `BROWSER-CLI/tests/ai-report-test.sh`, `BROWSER-CLI/states/authenticated-doctor.json` (created via saveState) |

---

## Estimated Effort

| Sprint | Effort | Priority |
|--------|--------|----------|
| 01 | 1 hour | P0 |
| 02 | 4 hours | P0 |
| 03 | 4 hours | P0 |
| 04 | 3 hours | P1 |
| 05 | 2 hours | P2 |
| 06 | 2 hours | P1 |
| **Total** | **16 hours** | |

---

## Success Criteria

- [ ] Doctor can click "Generate with AI" in report dialog
- [ ] AI suggestion appears within 15 seconds
- [ ] Doctor can accept, edit, or reject suggestion
- [ ] Report saved with AI tracking metadata
- [ ] Audit logs capture AI usage
- [ ] Cache reduces repeat API calls by 60%
- [ ] All browser-cli tests pass with evidence

---

## Related Documentation

- `11_GPT5_MINI_INTEGRATION_GUIDE` - Base OpenAI patterns
- `SECURITY_AUDIT_AI_INTEGRATION` - Security considerations
- `.claude/rules/BROWSER-CLI/NAV-MAP.md` - Test navigation reference
- `.claude/rules/BROWSER-CLI/SKILL.md` - Browser-CLI commands
