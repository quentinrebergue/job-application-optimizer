def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    adj = [[] for _ in range(num_courses)]
    for a, b in prerequisites:
        adj[b].append(a)

    state = [0] * num_courses  # 0=unvisited, 1=visiting, 2=done
    order = []

    def dfs(u: int) -> bool:
        if state[u] == 1:
            return False  # cycle
        if state[u] == 2:
            return True
        state[u] = 1
        for v in adj[u]:
            if not dfs(v):
                return False
        state[u] = 2
        order.append(u)
        return True

    for i in range(num_courses):
        if not dfs(i):
            return []
    return order[::-1]
