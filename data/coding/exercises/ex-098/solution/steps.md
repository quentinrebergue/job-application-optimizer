# Solution Approach: Bit-by-Bit Shift & Build

## Pattern Recognition
→ **Other (Bit Manipulation)** — build the result one bit at a time by reading `n` from the lowest bit up while writing into `result` from the highest bit down.

## Steps

1. Initialize `result = 0`.
2. For `i` in `range(32)`:
   - Shift `result` left by 1 to make room for the next bit: `result <<= 1`.
   - Pull the lowest bit off `n` and OR it in: `result |= (n & 1)`.
   - Shift `n` right by 1 to consume that bit: `n >>= 1`.
3. Return `result`.

## Why This Works
Each iteration moves the next-lowest bit of `n` into the next-highest available slot of `result`, so after 32 iterations the bit order is fully reversed.

## Complexity
- Time: O(32) = O(1)
- Space: O(1)
