# Kth Smallest Element in a Sorted Matrix

Given an `n × n` matrix where each row and column is sorted in ascending order, return the **kth smallest element** in the matrix.

Note: kth smallest in sorted order, not kth distinct.

You must find a solution with memory complexity better than O(n²).

**Example 1:**
```
Input:
matrix = [[1, 5, 9],
           [10,11,13],
           [12,13,15]], k = 8
Output: 13
Explanation: Sorted: [1,5,9,10,11,12,13,13,15], 8th = 13
```

**Example 2:**
```
Input:  matrix = [[-5]], k = 1
Output: -5
```

**Constraints:**
- `n == matrix.length == matrix[i].length`
- `1 <= n <= 300`
- `-10⁹ <= matrix[i][j] <= 10⁹`
- `1 <= k <= n²`
