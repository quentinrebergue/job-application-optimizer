def path_sum(root: TreeNode | None, target_sum: int) -> list[list[int]]:
    res = []

    def dfs(node: TreeNode | None, path: list[int], remaining: int) -> None:
        if not node:
            return
        path.append(node.val)
        remaining -= node.val
        if not node.left and not node.right and remaining == 0:
            res.append(path[:])
        dfs(node.left, path, remaining)
        dfs(node.right, path, remaining)
        path.pop()

    dfs(root, [], target_sum)
    return res
