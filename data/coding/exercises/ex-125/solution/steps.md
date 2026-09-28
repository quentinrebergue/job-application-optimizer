# Solution Approach: Preorder DFS with Null Markers

## Pattern Recognition
→ **Binary Tree** — a preorder traversal (root, then left, then right) that explicitly records `None` children as a marker (e.g. `"#"`) captures the tree's exact shape, not just its values, so it can be replayed to rebuild the same structure.

## Steps

**Serialize:**
1. DFS preorder: append `str(node.val)` for a real node, or `"#"` for a `None` child, then recurse left then right.
2. Join everything with a delimiter (e.g. commas) into one string.

**Deserialize:**
1. Split the string back into tokens and turn them into an iterator.
2. Recursively `build()`: pull the next token; if it's `"#"`, return `None`; otherwise create a node with that value, then recursively set `node.left = build()` and `node.right = build()`.

## Why This Works
Because every `None` child is explicitly recorded, the preorder sequence unambiguously determines where each subtree starts and ends — reading it back in the same root→left→right order reconstructs the exact original shape, not just *some* tree with the same values.

## Complexity
- Time: O(n) for both serialize and deserialize
- Space: O(n) for the string and the recursion stack
