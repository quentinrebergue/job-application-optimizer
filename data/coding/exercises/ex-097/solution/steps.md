# Solution Approach: Gauss Sum Formula (or XOR)

## Pattern Recognition
→ **Other (Math / Bit Trick)** — the numbers `0..n` have a known sum. The missing number is exactly the difference between that expected sum and the actual sum of the array.

## Steps

1. Compute `expected = n * (n + 1) / 2`, where `n = len(nums)`.
2. Compute `actual = sum(nums)`.
3. Return `expected - actual`.

## Why This Works
`nums` contains every value in `[0, n]` except one. The sum of the complete range `0..n` is a closed-form formula, so subtracting the array's actual sum isolates exactly the missing value — no need to sort or use extra space.

## Alternative
XOR every index `0..n` together with every value in `nums`; every present value cancels with its index, leaving only the missing number. Useful if you want to avoid the (unlikely, in Python) risk of integer overflow.

## Complexity
- Time: O(n)
- Space: O(1)
