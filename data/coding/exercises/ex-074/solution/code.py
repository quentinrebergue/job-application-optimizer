class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def clone_graph(node: Node | None) -> Node | None:
    if not node:
        return None
    visited = {}

    def dfs(n: Node) -> Node:
        if n in visited:
            return visited[n]
        clone = Node(n.val)
        visited[n] = clone
        clone.neighbors = [dfs(neighbor) for neighbor in n.neighbors]
        return clone

    return dfs(node)
