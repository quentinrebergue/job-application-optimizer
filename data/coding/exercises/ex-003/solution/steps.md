# Solution Approach: Variable Sliding Window + Hash Map

## Pattern Recognition
→ **Sliding Window (variable size)** — we need the longest subarray satisfying a uniqueness condition.

## Steps

1. Initialize `left = 0`, `maxLen = 0`, and a map `lastSeen: char → index`.
2. Iterate `right` from 0 to n-1:
   - If `s[right]` is already in `lastSeen` **and** its last index ≥ `left`, move `left` to `lastSeen[s[right]] + 1` (shrink window past the duplicate).
   - Record `lastSeen[s[right]] = right`.
   - Update `maxLen = max(maxLen, right - left + 1)`.
3. Return `maxLen`.

## Why This Works
The window `[left, right]` always contains unique characters. When we encounter a duplicate, we jump `left` directly past the previous occurrence (O(1)), rather than shrinking one step at a time.

## Complexity
- Time: O(n) — each character is visited at most twice
- Space: O(min(n, charset)) — at most 26/128 entries in the map