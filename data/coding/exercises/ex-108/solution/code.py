def count_components(n: int, edges: list[list[int]]) -> int:
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    visited = set()

    def dfs(node: int) -> None:
        visited.add(node)
        for neighbor in adj[node]:
            if neighbor not in visited:
                dfs(neighbor)

    count = 0
    for node in range(n):
        if node not in visited:
            count += 1
            dfs(node)

    return count
