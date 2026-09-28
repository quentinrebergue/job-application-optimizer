# Solution Approach: Preorder Gives Roots, Inorder Gives the Split

## Pattern Recognition
→ **Binary Tree** — the first element of `preorder` is always the current subtree's root. Its position in `inorder` splits everything to its left into the left subtree and everything to its right into the right subtree — recurse on both halves.

## Steps

1. Build a hash map `inorder_index: value -> index` for O(1) lookups.
2. Keep a running pointer `pre_idx` into `preorder`, starting at 0.
3. `build(in_left, in_right)`:
   - If `in_left > in_right`, return `None` (empty range).
   - Take `root_val = preorder[pre_idx]`, create the node, and advance `pre_idx`.
   - Look up `mid = inorder_index[root_val]`.
   - `root.left = build(in_left, mid - 1)`, `root.right = build(mid + 1, in_right)`.
   - Return `root`.
4. Call `build(0, len(inorder) - 1)`.

## Why This Works
Preorder always visits a subtree's root before any of its descendants, so consuming `preorder` left-to-right naturally gives roots in the right order — as long as we know how to split the corresponding inorder range, which `mid` (the root's position in inorder) tells us directly: everything before it is the left subtree, everything after is the right.

## Complexity
- Time: O(n)
- Space: O(n) for the hash map, plus O(h) recursion depth
