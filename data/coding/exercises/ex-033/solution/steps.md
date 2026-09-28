# Solution Approach: Two Pointers (Write Pointer)

## Pattern Recognition
→ **Two Pointers** — `slow` is the write pointer tracking the boundary of unique elements; `fast` scans ahead.

## Steps

1. If `nums` is empty, return 0.
2. `slow = 0` (last written unique element index).
3. For `fast` from 1 to n-1:
   - If `nums[fast] !== nums[slow]`: increment `slow`, write `nums[slow] = nums[fast]`.
4. Return `slow + 1`.

## Why It Works
The array is sorted, so all duplicates of a value are contiguous. `slow` only advances when we encounter a **new** value. The comparison `nums[fast] !== nums[slow]` is sufficient because everything between `slow` and `fast` is a duplicate of `nums[slow]`.

## Relation to Remove Duplicates II (ex-022)
The only difference: here we compare `nums[fast] !== nums[slow]` (allow 1 copy).
In ex-022: `nums[fast] !== nums[slow - 2]` (allow 2 copies).
General pattern for "at most k": `nums[fast] !== nums[slow - (k-1)]`.

## Complexity
- Time: O(n)
- Space: O(1)
