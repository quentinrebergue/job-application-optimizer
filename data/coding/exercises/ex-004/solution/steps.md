# Solution Approach: Stack

## Pattern Recognition
→ **Stack** — matching closing brackets against the most-recently-opened bracket.

## Steps

1. Create a mapping `close → open` for the three bracket pairs.
2. Initialize an empty stack.
3. For each character `c` in `s`:
   - If `c` is an opening bracket (`(`, `{`, `[`), push it onto the stack.
   - If `c` is a closing bracket:
     - If the stack is empty, return `false` (unmatched close).
     - Pop the top; if it doesn't match the expected open bracket, return `false`.
4. After the loop, return `true` only if the stack is empty (all opens were matched).

## Why This Works
A stack naturally tracks the nesting order. The last opened bracket must be the first closed — LIFO matches exactly.

## Complexity
- Time: O(n)
- Space: O(n) worst case (all opens, e.g. `((((`)