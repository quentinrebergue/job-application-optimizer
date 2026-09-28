**Pattern: Fast & Slow Pointers (Floyd's)**

Treat the array as a linked list where `nums[i]` is the next pointer. The duplicate creates a cycle. Phase 1: find meeting point. Phase 2: find cycle entry (= duplicate) by resetting slow to 0 and moving both 1 step.
