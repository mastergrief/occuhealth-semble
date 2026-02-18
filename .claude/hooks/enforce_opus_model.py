#!/usr/bin/env python3
"""
PreToolUse Hook: Enforce opus model for all Task tool subagent spawns.
Blocks Task invocations where model is missing or not 'opus'.
"""
import json
import sys
import select


def main():
    try:
        input_data = {}
        if select.select([sys.stdin], [], [], 0.1)[0]:
            try:
                input_data = json.load(sys.stdin)
            except json.JSONDecodeError:
                sys.exit(0)

        tool_name = input_data.get('tool_name', '')
        if tool_name != 'Task':
            sys.exit(0)

        tool_input = input_data.get('tool_input', {})
        model = tool_input.get('model', '')
        subagent_type = tool_input.get('subagent_type', 'unknown')
        description = tool_input.get('description', 'no description')

        if model == 'opus':
            sys.exit(0)

        # Block: model missing or wrong
        if not model:
            msg = f"BLOCKED: Task '{description}' (subagent: {subagent_type}) has no model specified. Must use model: opus."
        else:
            msg = f"BLOCKED: Task '{description}' (subagent: {subagent_type}) uses model '{model}'. Must use model: opus."

        print(msg, file=sys.stderr)
        sys.exit(2)

    except Exception as e:
        # Don't block on hook errors
        print(f"enforce_opus_model hook error: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
