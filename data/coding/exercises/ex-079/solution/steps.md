**Pattern: BFS (shortest path in unweighted graph)**

Each word is a node; edge exists if words differ by 1 letter. BFS finds shortest path. For each word in queue, try all 26 letter substitutions at each position; if result is in wordSet, enqueue it.
