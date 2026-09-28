# Solution Approach: Shrinking Boundaries

## Pattern Recognition
→ **Matrix simulation** — use four boundary variables that shrink after each directional pass.

## Steps

1. `top = 0`, `bottom = m-1`, `left = 0`, `right = n-1`.
2. While `top <= bottom && left <= right`:
   - **→ Top row**: cols `left` to `right`, then `top++`.
   - **↓ Right column**: rows `top` to `bottom`, then `right--`.
   - **← Bottom row** (only if `top <= bottom`): cols `right` to `left`, then `bottom--`.
   - **↑ Left column** (only if `left <= right`): rows `bottom` to `top`, then `left++`.
3. Return collected elements.

## Why the Guard Conditions?
After traversing the top row and right column, `top` and `right` have been advanced. The guard `top <= bottom` prevents re-traversing a single-row matrix's bottom, and `left <= right` prevents re-traversing a single-column matrix's left side.

## Complexity
- Time: O(m × n) — each element visited exactly once
- Space: O(1) excluding output
