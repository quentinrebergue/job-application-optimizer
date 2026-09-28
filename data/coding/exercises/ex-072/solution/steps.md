**Pattern: DFS with Global Max**

For each node, compute max gain from left and right subtrees (clamped to 0 if negative). Update global max with `node.val + leftGain + rightGain`. Return `node.val + max(left, right)` to parent (can only extend one side).
