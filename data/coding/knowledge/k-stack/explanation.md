# Stack & Queue

## Stack (LIFO)
Last In, First Out. Push/pop from the same end.

### When to Use
- Matching/validating nested structures (parentheses, HTML tags)
- Undo/redo operations
- Monotonic stack: next greater/smaller element problems
- DFS iterative implementation

### Monotonic Stack Pattern

```cpp
vector<int> nextGreater(vector<int>& arr) {
    int n = arr.size();
    vector<int> result(n, -1);
    stack<int> st;  // stores indices
    for (int i = 0; i < n; i++) {
        while (!st.empty() && arr[st.top()] < arr[i]) {
            result[st.top()] = arr[i];
            st.pop();
        }
        st.push(i);
    }
    return result;
}
```

## Queue (FIFO)
First In, First Out. Enqueue at back, dequeue from front.

### When to Use
- BFS traversal
- Sliding window maximum (deque)
- Task scheduling

### BFS with Queue

```cpp
vector<int> bfs(int start, vector<vector<int>>& adj) {
    int n = adj.size();
    vector<bool> visited(n, false);
    queue<int> q;
    q.push(start); visited[start] = true;
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u])
            if (!visited[v]) { visited[v] = true; q.push(v); }
    }
    return order;
}
```

## Complexity
- Stack push/pop: O(1) — use `std::stack`
- Queue enqueue/dequeue: O(1) — use `std::queue` or `std::deque`

## Classic Problems
- Valid Parentheses, Daily Temperatures, Largest Rectangle in Histogram, Sliding Window Maximum
