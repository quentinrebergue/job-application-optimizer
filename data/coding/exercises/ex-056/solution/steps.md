**Pattern: Fast & Slow Pointers (Cycle Detection)**

The sequence either reaches 1 or enters a cycle. Use Floyd's: slow does 1 step, fast does 2. If fast == 1, happy. If slow == fast (not 1), there's a cycle → not happy.
