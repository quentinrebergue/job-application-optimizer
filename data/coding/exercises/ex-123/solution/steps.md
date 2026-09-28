# Solution Approach: Recursive Structural Comparison

## Pattern Recognition
→ **Binary Tree** — two trees are identical exactly when their roots hold the same value AND both pairs of subtrees are (recursively) identical too.

## Steps

1. If both `p` and `q` are `None`, return `True` (two empty trees match).
2. If exactly one of them is `None`, return `False` (structural mismatch).
3. If `p.val != q.val`, return `False`.
4. Otherwise return `is_same_tree(p.left, q.left) and is_same_tree(p.right, q.right)`.

## Why This Works
Structural + value equality is naturally recursive: two trees match only if their roots match AND both corresponding subtree pairs match, all the way down to the leaves (or `None`s).

## Complexity
- Time: O(min(n, m)) — stops as soon as a mismatch is found
- Space: O(min(h_p, h_q)) recursion depth
