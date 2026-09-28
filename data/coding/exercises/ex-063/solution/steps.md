**Pattern: Monotonic Stack (increasing)**

Maintain increasing stack of indices. When a shorter bar appears, pop taller bars and compute their max rectangle width (current index - stack_top - 1). Add sentinel 0 at the end to flush remaining bars.
