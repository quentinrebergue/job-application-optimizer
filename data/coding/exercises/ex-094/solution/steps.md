# Solution Approach: Bit Manipulation (XOR + Carry)

## Pattern Recognition
→ **Other (Bit Manipulation)** — this doesn't fit a classic array/graph/DP pattern. Addition without `+` is a hardware-adder simulation: XOR gives the sum of each bit ignoring carries, AND (shifted left) gives where a carry is produced. Repeat until there's no carry left.

## Steps

1. Mask everything to 32 bits (`mask = 0xFFFFFFFF`) since Python integers don't wrap like fixed-width integers.
2. While `b != 0`:
   - `carry = (a & b) << 1` — bits where both operands are 1 produce a carry.
   - `a = (a ^ b) & mask` — XOR sums bits without carrying.
   - `b = carry & mask`.
3. Once `b` is 0, `a` holds the 32-bit unsigned result. If its top bit is set, convert it back to a negative Python int (`~(a ^ mask)`); otherwise return it as-is.

## Why This Works
This is exactly how a binary full-adder works: XOR computes the sum bit, AND-then-shift computes the carry bit. Repeating until the carry is exhausted is equivalent to propagating carries left, one "column" at a time, just like adding on paper.

## Complexity
- Time: O(1) — at most 32 iterations (bounded by integer width)
- Space: O(1)
