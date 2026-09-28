def binary_tree_paths(root: TreeNode | None) -> list[str]:
    res = []

    def dfs(node: TreeNode, path: str) -> None:
        if not node.left and not node.right:
            res.append(path)
            return
        if node.left:
            dfs(node.left, path + '->' + str(node.left.val))
        if node.right:
            dfs(node.right, path + '->' + str(node.right.val))

    if root:
        dfs(root, str(root.val))
    return res
