# Session Continuation v2.0 → v4.0 Upgrade Plan

## Executive Summary
Upgrade `session_continuation.py` to be compatible with Python 3.14 Enhanced Context Manager v4.0, modernizing type hints to PEP 649 standards while maintaining full backwards compatibility with existing compact files.

## Current State Analysis

### session_continuation.py v2.0 (1073 lines)
- **Type Hints**: Old style (`Optional[Path]`, `Dict[str, Any]`, `List[...]`, `Tuple[...]`)
- **References**: "intelligent_context_manager_enhanced.py v2.0" (line 6)
- **Functionality**: Reads JSON from `context_compact_*.md` files
- **Dependencies**: No direct imports from context manager (loose coupling via JSON)

### intelligent_context_manager_py314.py v4.0 (661 lines)
- **Type Hints**: Modern Python 3.14 style (`str | None`, `dict[str, Any]`, `list[...]`, `Self`)
- **Features**: PEP 649 (Deferred annotations), JIT-optimized patterns
- **Status**: INCOMPLETE - main() placeholder, no compact file writing yet
- **Future**: Will write same JSON format as v2.0 for compatibility

### intelligent_context_manager_enhanced.py v2.0 (1763 lines)
- **Status**: CURRENT working version
- **Writes**: Complete compact files with expected JSON structure
- **Format**: session_continuation.py expects this format

## Compatibility Requirements

### JSON Contract (MUST MAINTAIN)
```python
{
    "timestamp": "ISO 8601",
    "trigger": "manual" | "auto",
    "conversation_stats": {...},
    "work_completed": {...},
    "cognitive_state": {...},
    "key_insights": {...},
    "recent_context": {
        "continuation_point": {
            "last_active_file": str,
            "last_active_symbol": str,
            "last_operation": str,
            "current_task": str,
            "next_expected_action": str,
            "in_progress_todos": list[str],
            "browser_state": dict
        },
        "quality_score": {...},
        "detected_template": str,
        "current_phase": str,
        "predicted_next_actions": list[dict],
        "operation_chains": list[dict]
    }
}
```

## Implementation Plan

### Phase 1: Add Future Annotations Import
**Location**: Line 1 (before docstring)
```python
from __future__ import annotations
```

### Phase 2: Update Docstring References
**Location**: Lines 2-6
```python
"""
Enhanced Session Continuation Hook v4.0 - SessionStart
Advanced context restoration with quality-based recovery, predictive actions, and template awareness.
Works in tandem with intelligent_context_manager_py314.py v4.0 (Python 3.14 Enhanced)
"""
```

### Phase 3: Modernize Type Hints (PEP 649)

**Pattern Replacements**:
- `Optional[X]` → `X | None`
- `Dict[X, Y]` → `dict[X, Y]`
- `List[X]` → `list[X]`
- `Tuple[X, Y]` → `tuple[X, Y]`

**Functions to Update**:
1. Line 22: `determine_recovery_strategy(self, quality_score: dict) -> dict:`
2. Line 82: `generate_recovery_script(self, strategy: dict, context: dict) -> str:`
3. Line 120: `format_predicted_actions(self, predicted_actions: list, elapsed_hours: int) -> str:`
4. Line 170: `calculate_time_decay(self, hours_elapsed: int) -> float:`
5. Line 259: `get_template_recovery(self, template: str, context: dict) -> dict:`
6. Line 276: `_customize_actions(self, actions: list, context: dict) -> list:`
7. Line 296: `reconstruct_workflow(self, operation_chains: list) -> dict:`
8. Line 337: `_suggest_chain_completion(self, chain: dict) -> str:`
9. Line 353: `format_chain_summary(self, chains: list) -> str:`
10. Line 401: `analyze_error_context(self, context: dict) -> dict:`
11. Line 495: `_classify_error(self, error_msg: str) -> str:`
12. Line 508: `format_error_recovery(self, error_analysis: dict) -> str:`
13. Line 553: `format_visual_context(self, context: dict) -> str:`
14. Line 607: `find_related_memories(self, context: dict) -> list:`
15. Line 663: `format_memory_suggestions(self, memories: list) -> str:`
16. Line 686: `generate_auto_recovery(self, context: dict, quality_score: dict) -> str:`
17. Line 749: `find_recent_compact_file() -> Path | None:`
18. Line 773: `parse_compact_file(file_path: Path) -> dict[str, Any]:`
19. Line 796: `calculate_time_since_compact(compact_file: Path) -> tuple[str, int]:`
20. Line 844: `enhanced_format_continuation_message(context_data: dict[str, Any], time_since: str, hours_elapsed: int, filename: str) -> str:`

### Phase 4: Update Import Statements
**Location**: Lines 15-16
```python
from typing import Self, Any  # PEP 649 modern types
```

**Remove**:
- `Optional` (replaced by `| None`)
- `Dict` (replaced by `dict`)
- `List` (replaced by `list`)
- `Tuple` (replaced by `tuple`)

### Phase 5: Version Alignment
**Location**: Line 3
- Update "v2.0" → "v4.0"

**Location**: Line 6
- Update reference to v4.0

## Testing Strategy

### Test Suite Components

**1. Type Hint Validation**
- Verify all function signatures parse correctly
- Test Python 3.14 compatibility
- Validate `from __future__ import annotations` behavior

**2. JSON Format Compatibility**
- Test reading v2.0 compact files (backwards compatibility)
- Mock v4.0 compact file format
- Validate all fields parse correctly

**3. Recovery Strategy Testing**
- Test QualityBasedRecovery with all grades (A, B, C, D, F)
- Test PredictiveRecovery time decay
- Test TemplateAwareRecovery for all templates
- Test ErrorStateRecovery for all error types
- Test ChainReconstructor logic
- Test VisualContextRestorer
- Test SmartMemoryLoader
- Test AutomationEngine

**4. Integration Testing**
- Test full SessionStart hook flow
- Verify system message generation
- Test with missing/incomplete compact files

## Validation Checklist

- [ ] `from __future__ import annotations` added at line 1
- [ ] All `Optional[X]` replaced with `X | None`
- [ ] All `Dict[X, Y]` replaced with `dict[X, Y]`
- [ ] All `List[X]` replaced with `list[X]`
- [ ] All `Tuple[X, Y]` replaced with `tuple[X, Y]`
- [ ] Version references updated to v4.0
- [ ] pytest test suite created and passing
- [ ] Backwards compatibility verified with v2.0 compact files
- [ ] npm run typecheck passes
- [ ] No runtime errors with Python 3.14

## Backwards Compatibility Guarantee

**JSON Format**: NO CHANGES
- session_continuation.py will continue to read the exact same JSON format
- Works with compact files from v2.0, v3.0, and future v4.0
- Loose coupling via file I/O ensures independence

**Runtime Compatibility**:
- Python 3.14+ required (for `from __future__ import annotations` and modern syntax)
- Falls back gracefully if compact files missing
- No breaking changes to hook interface

## Risk Assessment

**LOW RISK**:
- Type hint changes are static analysis only (no runtime impact)
- JSON format unchanged
- No new dependencies
- Maintains loose coupling
- Comprehensive test coverage

**Mitigation**:
- Extensive pytest coverage
- Validation with existing compact files
- Gradual rollout capability
- Easy rollback to v2.0 if issues arise

## Success Metrics

1. **100% Type Hint Modernization**: All old-style hints converted
2. **Zero Regression**: All existing functionality preserved
3. **100% Test Pass Rate**: All pytest tests passing
4. **Type Check Clean**: npm run typecheck passes
5. **Backwards Compatible**: Works with v2.0 compact files
6. **Future Compatible**: Ready for v4.0 compact files

## Timeline

- **Phase 1-2**: 15 minutes (imports, docstrings)
- **Phase 3**: 45 minutes (type hint updates)
- **Phase 4**: 5 minutes (import cleanup)
- **Phase 5**: 30 minutes (testing)
- **Total**: ~90 minutes

## Conclusion

This upgrade modernizes session_continuation.py to Python 3.14 standards while maintaining 100% backwards compatibility. The loose coupling via JSON files ensures no breaking changes, making this a low-risk, high-value upgrade.