# Topological Sort

A **topological ordering** of a Directed Acyclic Graph (DAG) is a linear ordering of nodes such that for every directed edge `u → v`, node `u` comes before `v`. It only exists if the graph has **no cycle**.

---

## When to use it

- Course prerequisites / build order (dependencies before dependents)
- Task scheduling with constraints
- Compilation order (header files, modules)
- ML model layer ordering (computation graph)

---

## Algorithm 1 — DFS Post-order

Use 3 node states: **unvisited (0)**, **visiting (1)**, **done (2)**.

```cpp
vector<int> order;
vector<int> state;  // 0=unvisited, 1=visiting, 2=done

bool dfs(int u, vector<vector<int>>& adj) {
    if (state[u] == 1) return false;  // cycle detected
    if (state[u] == 2) return true;
    state[u] = 1;
    for (int v : adj[u])
        if (!dfs(v, adj)) return false;
    state[u] = 2;
    order.push_back(u);               // post-order: add AFTER all successors
    return true;
}

vector<int> topoSort(int n, vector<vector<int>>& adj) {
    state.assign(n, 0);
    for (int i = 0; i < n; i++)
        if (state[i] == 0 && !dfs(i, adj)) return {};  // cycle
    reverse(order.begin(), order.end());
    return order;
}
```

**Time:** O(V + E) — **Space:** O(V)

---

## Algorithm 2 — Kahn's Algorithm (BFS / In-degree)

1. Compute **in-degree** of every node
2. Seed queue with all nodes with **in-degree = 0**
3. Process queue: pop a node, add to result, decrement neighbors' in-degree; enqueue those reaching 0
4. If result has fewer than N nodes → cycle detected

```cpp
vector<int> kahnSort(int n, vector<vector<int>>& adj) {
    vector<int> inDeg(n, 0);
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) inDeg[v]++;

    queue<int> q;
    for (int i = 0; i < n; i++)
        if (inDeg[i] == 0) q.push(i);

    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u])
            if (--inDeg[v] == 0) q.push(v);
    }
    return (int)order.size() == n ? order : vector<int>{};  // empty = cycle
}
```

**Time:** O(V + E) — **Space:** O(V)

---

## DFS vs Kahn's

| | DFS post-order | Kahn's (BFS) |
|---|---|---|
| Cycle detection | visiting state | result.size() < n |
| Order produced | reverse post-order | layer by layer |
| Prefer when | need recursive DFS anyway | want BFS / in-degree info |

---

## Complexity

| | Time | Space |
|---|---|---|
| Both algorithms | O(V + E) | O(V + E) |
