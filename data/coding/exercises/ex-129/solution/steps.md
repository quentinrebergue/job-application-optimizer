# Solution Approach: Use BST Ordering to Steer Toward the Split Point

## Pattern Recognition
→ **Binary Tree** — in a BST, the current node is the LCA of `p` and `q` exactly at the point where they stop being on the same side. Compare both values against the current node's value to decide whether to go left, go right, or stop.

## Steps

1. Start at `node = root`.
2. While `True`:
   - If both `p.val` and `q.val` are less than `node.val`, move to `node.left`.
   - Else if both are greater than `node.val`, move to `node.right`.
   - Otherwise (one is ≤ `node.val` and the other is ≥, or one equals `node.val`), `node` is the split point — return it.

## Why This Works
BST ordering guarantees that if both targets are smaller than the current node, their LCA must be in the left subtree (and symmetrically for the right). The first node where they diverge — one going left, one going right (or one being the node itself) — is necessarily their lowest common ancestor, since any node further up would still have them both underneath it, but less tightly.

## Complexity
- Time: O(h), where h is the tree height
- Space: O(1) — purely iterative, no recursion
