def max_path_sum(root: TreeNode | None) -> int:
    max_sum = float('-inf')

    def gain(node: TreeNode | None) -> int:
        nonlocal max_sum
        if not node:
            return 0
        left = max(0, gain(node.left))
        right = max(0, gain(node.right))
        max_sum = max(max_sum, node.val + left + right)
        return node.val + max(left, right)

    gain(root)
    return max_sum
