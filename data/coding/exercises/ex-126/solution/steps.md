# Solution Approach: Same Tree Check at Every Node

## Pattern Recognition
→ **Binary Tree** — reuse the "are these two trees identical" check (Same Tree) as a helper, and try it rooted at every node of `root`. If it ever succeeds, `subRoot` is a subtree.

## Steps

1. If `root` is `None`, return `False` (nothing left to check `subRoot` against).
2. If `is_same_tree(root, subRoot)` is `True`, return `True`.
3. Otherwise, return `has_subtree(root.left, subRoot) or has_subtree(root.right, subRoot)`.

## Why This Works
`subRoot` is a subtree of `root` exactly when *some* node in `root` is the root of a tree structurally identical to `subRoot`. Recursively trying the identical-tree check at every node — and short-circuiting as soon as one matches — covers every candidate position exactly once.

## Complexity
- Time: O(n × m), where n and m are the node counts of `root` and `subRoot` (worst case, checking identity at every node)
- Space: O(h) recursion depth
