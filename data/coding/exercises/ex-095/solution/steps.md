# Solution Approach: Brian Kernighan's Bit Trick

## Pattern Recognition
→ **Other (Bit Manipulation)** — `n & (n - 1)` clears the lowest set bit. Counting how many times you can do that before reaching 0 gives the number of set bits, without checking all 32 positions individually.

## Steps

1. Initialize `count = 0`.
2. While `n != 0`:
   - `n &= (n - 1)` — clears the lowest set bit.
   - `count += 1`.
3. Return `count`.

## Why This Works
`n - 1` flips all the trailing zeros of `n` to ones and its lowest set bit to zero. ANDing with the original `n` therefore removes exactly that one set bit, so the loop runs exactly once per set bit rather than once per bit position.

## Complexity
- Time: O(k), where k is the number of set bits (at most 32)
- Space: O(1)
