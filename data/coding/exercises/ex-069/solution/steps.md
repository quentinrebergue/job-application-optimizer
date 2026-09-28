**Pattern: Staircase Search (O(m+n))**

Start at top-right corner. If current > target, move left. If current < target, move down. If equal, found. This works because each move eliminates a row or column.
