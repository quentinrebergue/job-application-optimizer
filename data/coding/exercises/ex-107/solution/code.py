def valid_tree(n: int, edges: list[list[int]]) -> bool:
    if len(edges) != n - 1:
        return False

    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    visited = set()

    def dfs(node: int, parent: int) -> bool:
        visited.add(node)
        for neighbor in adj[node]:
            if neighbor == parent:
                continue
            if neighbor in visited:
                return False
            if not dfs(neighbor, node):
                return False
        return True

    return dfs(0, -1) and len(visited) == n
