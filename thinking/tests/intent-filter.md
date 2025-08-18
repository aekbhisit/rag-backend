# Intent Filter Service Tests

- T-INT-001 Strategy scope_only → filters = { scope }
- T-INT-002 Strategy action_only → filters = { action }
- T-INT-003 Strategy scope_and_action → filters = { scope, action }
- T-INT-004 Strategy combined (detail) → filters = { detail }
- T-INT-005 Strategy text_only → filters = {}
- T-INT-006 Detail normalization
  - Steps: whitespace-only detail; mixed casing
  - Expect: strategy selection consistent (likely text_only if normalized empty)
