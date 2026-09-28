class Codec:
    def serialize(self, root: TreeNode | None) -> str:
        vals = []

        def dfs(node: TreeNode | None) -> None:
            if not node:
                vals.append('#')
                return
            vals.append(str(node.val))
            dfs(node.left)
            dfs(node.right)

        dfs(root)
        return ','.join(vals)

    def deserialize(self, data: str) -> TreeNode | None:
        vals = iter(data.split(','))

        def build() -> TreeNode | None:
            val = next(vals)
            if val == '#':
                return None
            node = TreeNode(int(val))
            node.left = build()
            node.right = build()
            return node

        return build()
