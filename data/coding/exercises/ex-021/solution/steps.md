# Solution Approach: Sliding Window + Frequency Maps

## Pattern Recognition
→ **Variable Sliding Window** — expand right until all characters are covered, then shrink left to minimize the window.

## Steps

1. Build `need: Map<char, count>` from `t`. Set `required = need.size` (distinct chars needed).
2. Initialize `window: Map<char, count>`, `formed = 0`, `left = 0`, best window `(minLen, start)`.
3. Iterate `right` from 0 to m-1:
   - Add `s[right]` to `window`.
   - If `window.get(s[right]) === need.get(s[right])`, increment `formed`.
   - While `formed === required` (window is valid):
     - Update best if current window is smaller.
     - Remove `s[left]` from window; if its count drops below needed, decrement `formed`.
     - `left++`.
4. Return best substring or `""`.

## Why Track `formed`?
Instead of checking all characters on every step, `formed` counts how many distinct characters are currently satisfied. It increments only when a character count exactly reaches the required amount, and decrements only when it drops below. O(1) check per step.

## Complexity
- Time: O(m + n) — each character enters and leaves the window at most once
- Space: O(m + n) for the maps
