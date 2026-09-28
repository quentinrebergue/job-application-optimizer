# Trees & Graph Traversal (BFS / DFS)

## Core Traversals

### DFS (Depth-First Search)
Go as deep as possible before backtracking. Use a stack (or recursion).

```cpp
void dfs(int node, vector<vector<int>>& adj, vector<bool>& visited) {
    visited[node] = true;
    for (int nb : adj[node])
        if (!visited[nb])
            dfs(nb, adj, visited);
}

// Iterative
void dfsIter(int root, vector<vector<int>>& adj) {
    vector<bool> vis(adj.size(), false);
    stack<int> st;
    st.push(root); vis[root] = true;
    while (!st.empty()) {
        int u = st.top(); st.pop();
        for (int v : adj[u])
            if (!vis[v]) { vis[v] = true; st.push(v); }
    }
}
```

### BFS (Breadth-First Search)
Level by level. Use a queue. Finds shortest path in unweighted graphs.

```cpp
void bfs(int root, vector<vector<int>>& adj) {
    vector<bool> vis(adj.size(), false);
    queue<int> q;
    q.push(root); vis[root] = true;
    int level = 0;
    while (!q.empty()) {
        int sz = q.size();
        for (int i = 0; i < sz; i++) {   // process level by level
            int u = q.front(); q.pop();
            for (int v : adj[u])
                if (!vis[v]) { vis[v] = true; q.push(v); }
        }
        level++;
    }
}
```

## Binary Tree Traversals

```cpp
struct TreeNode { int val; TreeNode* left; TreeNode* right; };

void inorder(TreeNode* root, vector<int>& res) {   // left→root→right (sorted for BST)
    if (!root) return;
    inorder(root->left, res);
    res.push_back(root->val);
    inorder(root->right, res);
}

void preorder(TreeNode* root, vector<int>& res) {  // root→left→right
    if (!root) return;
    res.push_back(root->val);
    preorder(root->left, res);
    preorder(root->right, res);
}
```

## When to Use Which
| Goal | Use |
|------|-----|
| Shortest path (unweighted) | BFS |
| Detect cycle / connected components | DFS |
| Level-order traversal | BFS |
| Topological sort | DFS |
| Solve a maze / flood fill | Either (DFS simpler) |

## Complexity
- Time: O(V + E) for both BFS and DFS
- Space: O(V) for visited set + queue/stack

## Classic Problems
- Number of Islands, Clone Graph, Word Ladder, Course Schedule (topo sort), Binary Tree Level Order Traversal
