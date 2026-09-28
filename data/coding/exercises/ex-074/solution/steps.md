**Pattern: DFS with Hash Map (visited)**

Use a map `original → clone`. For each node, if already cloned, return the clone. Otherwise create a new clone, add to map, then recursively clone all neighbors.
