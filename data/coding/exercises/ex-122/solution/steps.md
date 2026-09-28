# Solution Approach: Recursive DFS

## Pattern Recognition
→ **Binary Tree** — the depth of a tree is `1 + max(depth of left subtree, depth of right subtree)`. A base case of `0` for an empty node makes the recursion self-contained.

## Steps

1. If `root` is `None`, return `0`.
2. Otherwise, return `1 + max(max_depth(root.left), max_depth(root.right))`.

## Why This Works
Every node's depth naturally decomposes into "1 (for itself) plus the deeper of its two subtrees" — a textbook recursive tree definition that needs no extra bookkeeping.

## Complexity
- Time: O(n) — visits every node once
- Space: O(h), where h is the tree height (recursion stack)
