# Solution Approach: Binary Search on Window Start

## Pattern Recognition
→ **Binary Search** — the answer window of size `k` starts at some index `left`. Binary search for the optimal `left` in `[0, n-k]`.

## Key Insight
For a window `[mid, mid+k]` of size k+1, we're deciding whether to include `arr[mid]` or `arr[mid+k]`:
- If `x - arr[mid] > arr[mid+k] - x`: `arr[mid]` is farther → move window right (`left = mid + 1`).
- Else: `arr[mid+k]` is farther or equal (prefer smaller) → window is too far right (`right = mid`).

## Steps

1. `left = 0`, `right = arr.length - k`.
2. While `left < right`:
   - `mid = (left + right) >> 1`.
   - If `x - arr[mid] > arr[mid + k] - x`: `left = mid + 1`.
   - Else: `right = mid`.
3. Return `arr.slice(left, left + k)`.

## Why This Works
The comparison is between the leftmost and rightmost candidate of a k+1 element window. The winner stays, the loser is discarded. Binary search converges to the optimal window start.

## Complexity
- Time: O(log(n - k) + k)
- Space: O(k) for output
