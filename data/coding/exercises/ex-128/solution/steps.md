# Solution Approach: DFS with a Valid-Range Bound

## Pattern Recognition
→ **Binary Tree** — checking "is my value greater than my immediate parent" isn't enough, since a node must satisfy constraints from *every* ancestor, not just its parent. Pass down a shrinking `(low, high)` bound as you recurse.

## Steps

1. Define `validate(node, low, high)`:
   - If `node` is `None`, return `True` (empty subtree is trivially valid).
   - If `node.val <= low` or `node.val >= high`, return `False`.
   - Return `validate(node.left, low, node.val) and validate(node.right, node.val, high)`.
2. Call `validate(root, -infinity, infinity)`.

## Why This Works
Every node in a valid BST must lie strictly between the tightest lower and upper bounds established by all of its ancestors so far — not just its direct parent. Threading `(low, high)` down through the recursion, and tightening one side of it at each step, encodes exactly that global constraint.

## Complexity
- Time: O(n)
- Space: O(h) recursion depth
