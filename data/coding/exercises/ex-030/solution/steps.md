# Solution Approach: Binary Search on Value Space

## Pattern Recognition
→ **Binary Search on answer** — the answer is a value in `[matrix[0][0], matrix[n-1][n-1]]`; binary search for the smallest value `x` such that exactly `k` elements ≤ `x`.

## Steps

1. `left = matrix[0][0]`, `right = matrix[n-1][n-1]`.
2. Binary search:
   - `mid = (left + right) / 2`.
   - Count elements ≤ `mid` using **staircase traversal**:
     - Start at top-right: `row=0`, `col=n-1`, `count=0`.
     - While `row < n`:
       - While `col >= 0 && matrix[row][col] > mid`: `col--`.
       - `count += col + 1`, `row++`.
   - If `count < k`: `left = mid + 1`.
   - Else: `right = mid`.
3. Return `left`.

## Staircase Count
Starting at top-right, if `matrix[row][col] <= mid` then all elements to the left in that row also qualify (sorted rows). Move down. If not, move left. O(n) total.

## Why Does `left` Always Converge to a Matrix Element?
When `count >= k`, `right = mid`. Since `left` only increases when `count < k`, it converges to the exact kth smallest value present in the matrix.

## Complexity
- Time: O(n log(max-min))
- Space: O(1)
