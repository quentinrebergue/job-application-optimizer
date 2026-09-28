# Solution Approach: Two Pointers (Write Pointer)

## Pattern Recognition
→ **Two Pointers** — `slow` is the write pointer; `fast` reads ahead. The condition "at most twice" maps to comparing with position `slow - 2`.

## Steps

1. If `nums.length <= 2`, return `nums.length` (trivially valid).
2. `slow = 2` (first two elements always kept).
3. For `fast` from 2 to n-1:
   - If `nums[fast] !== nums[slow - 2]`: write `nums[slow] = nums[fast]`, increment `slow`.
4. Return `slow`.

## Why `nums[fast] !== nums[slow - 2]`?
`nums[slow-2]` is the element two positions back in the result. If the current element equals it, we already have two copies → skip. If not, it's safe to include (may be a second copy or new element).

## Generalization
For "at most k duplicates": check `nums[fast] !== nums[slow - k]`.

## Complexity
- Time: O(n)
- Space: O(1)
