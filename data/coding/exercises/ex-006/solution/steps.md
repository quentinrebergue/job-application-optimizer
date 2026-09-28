# Solution Approach: Modified Binary Search

## Pattern Recognition
→ **Binary Search** — O(log n) is required; exploit the fact that at least one half of the array is always sorted.

## Steps

1. Set `left = 0`, `right = n - 1`.
2. While `left ≤ right`:
   - Compute `mid = left + (right - left) // 2`.
   - If `nums[mid] == target`, return `mid`.
   - Determine which half is sorted:
     - **Left half sorted** (`nums[left] ≤ nums[mid]`):
       - If `nums[left] ≤ target < nums[mid]`, search left: `right = mid - 1`.
       - Else search right: `left = mid + 1`.
     - **Right half sorted** (`nums[mid] < nums[right]`):
       - If `nums[mid] < target ≤ nums[right]`, search right: `left = mid + 1`.
       - Else search left: `right = mid - 1`.
3. Return `-1`.

## Why This Works
After a rotation, one of the two halves around `mid` is always contiguous and sorted. We can check in O(1) whether the target falls in that half, and discard the other.

## Complexity
- Time: O(log n)
- Space: O(1)