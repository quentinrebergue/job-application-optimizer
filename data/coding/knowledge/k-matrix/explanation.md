# Matrix Traversal & In-Place Operations

## Spiral Traversal
Use four shrinking boundaries: `top`, `bottom`, `left`, `right`.

```cpp
vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> res;
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) res.push_back(matrix[top][c]); top++;
        for (int r = top; r <= bottom; r++) res.push_back(matrix[r][right]); right--;
        if (top <= bottom)
            for (int c = right; c >= left; c--) res.push_back(matrix[bottom][c]);
        bottom--;
        if (left <= right)
            for (int r = bottom; r >= top; r--) res.push_back(matrix[r][left]);
        left++;
    }
    return res;
}
```

## 90° Clockwise Rotation (in-place)
**Two steps**: transpose (flip along main diagonal) → reverse each row.

```cpp
void rotate(vector<vector<int>>& m) {
    int n = m.size();
    for (int i = 0; i < n; i++)          // transpose
        for (int j = i + 1; j < n; j++)
            swap(m[i][j], m[j][i]);
    for (int i = 0; i < n; i++)          // reverse rows
        reverse(m[i].begin(), m[i].end());
}
```

**Why it works**: transposing gives (i,j) → (j,i). Reversing each row maps j → n-1-j. Combined: (i,j) → (j, n-1-i), exactly a 90° clockwise rotation.

## DFS on Grid (4-directional)

```cpp
const int DR[] = {1, -1, 0, 0};
const int DC[] = {0, 0, 1, -1};

void dfs(vector<vector<char>>& grid, int r, int c) {
    int R = grid.size(), C = grid[0].size();
    if (r < 0 || r >= R || c < 0 || c >= C || grid[r][c] != '1') return;
    grid[r][c] = '0';   // mark visited in-place
    for (int d = 0; d < 4; d++)
        dfs(grid, r + DR[d], c + DC[d]);
}
```

## Classic Problems
- Spiral Matrix, Rotate Image, Set Matrix Zeroes, Search a 2D Matrix, Kth Smallest in Sorted Matrix
