def build_tree(preorder: list[int], inorder: list[int]) -> TreeNode | None:
    inorder_index = {val: i for i, val in enumerate(inorder)}
    pre_idx = 0

    def build(in_left: int, in_right: int) -> TreeNode | None:
        nonlocal pre_idx
        if in_left > in_right:
            return None

        root_val = preorder[pre_idx]
        root = TreeNode(root_val)
        pre_idx += 1

        mid = inorder_index[root_val]
        root.left = build(in_left, mid - 1)
        root.right = build(mid + 1, in_right)
        return root

    return build(0, len(inorder) - 1)
