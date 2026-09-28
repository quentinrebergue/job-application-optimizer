from collections import deque


def level_order_bottom(root: TreeNode | None) -> list[list[int]]:
    if not root:
        return []
    res = []
    queue = deque([root])

    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        res.insert(0, level)
    return res
