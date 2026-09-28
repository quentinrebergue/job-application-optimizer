# Solution Approach: Two Pointers, Skipping Non-Alphanumeric Characters

## Pattern Recognition
→ **Two Pointers** — converge from both ends toward the middle, skipping over punctuation/spaces and comparing only alphanumeric characters case-insensitively.

## Steps

1. Set `left = 0`, `right = len(s) - 1`.
2. While `left < right`:
   - Advance `left` while `s[left]` is not alphanumeric.
   - Retreat `right` while `s[right]` is not alphanumeric.
   - If `s[left].lower() != s[right].lower()`, return `False`.
   - Advance `left`, retreat `right`.
3. Return `True`.

## Why This Works
A palindrome check only needs to compare mirrored positions from the outside in — the two-pointer convergence pattern does this directly in one pass, and skipping non-alphanumeric characters inline avoids allocating a separate cleaned string first.

## Complexity
- Time: O(n)
- Space: O(1)
