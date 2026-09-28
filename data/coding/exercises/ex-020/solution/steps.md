# Solution Approach: Fast Exponentiation (Iterative)

## Pattern Recognition
→ **Fast Exponentiation** — halve the exponent each step; square the base. O(log n) instead of O(n).

## Steps

1. Handle negative `n`: set `x = 1 / x`, `n = -n`.
2. Initialize `result = 1`.
3. While `n > 0`:
   - If `n` is odd (`n & 1`): `result *= x` (multiply current power into result).
   - Square the base: `x *= x`.
   - Halve the exponent: `n >>= 1`.
4. Return `result`.

## Why It Works
We process `n` in binary. Each bit position corresponds to a power of `x` (x¹, x², x⁴, x⁸ …). When a bit is set, we multiply that power into the result.

Example: `x^13`, 13 = 1101₂ → x^8 × x^4 × x^1.

## Edge Cases
- `n = 0` → return 1 (loop never executes).
- `n = Integer.MIN_VALUE` → negating overflows in some languages. In TypeScript, numbers are 64-bit float so `-n` works fine.

## Complexity
- Time: O(log n)
- Space: O(1)
