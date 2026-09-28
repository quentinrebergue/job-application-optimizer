# Solution Approach: Recursive Swap

## Pattern Recognition
→ **Binary Tree** — inverting a tree just means swapping every node's left and right children, recursively, all the way down.

## Steps

1. If `root` is `None`, return `None`.
2. Swap `root.left` and `root.right`.
3. Recurse into `invert_tree(root.left)` and `invert_tree(root.right)` (the now-swapped children).
4. Return `root`.

## Why This Works
A mirrored tree is exactly "every node's children swapped, and each of those subtrees mirrored too" — a direct recursive definition that mirrors (pun intended) the tree's own recursive structure.

## Complexity
- Time: O(n)
- Space: O(h) recursion depth
