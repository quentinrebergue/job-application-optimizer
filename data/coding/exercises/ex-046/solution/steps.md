# Solution Approach: Two-Pass Greedy

## Pattern Recognition
→ **Greedy** — two key observations collapse a brute-force O(n²) into O(n).

## Two Observations

**1. Feasibility check**: If `sum(gas) < sum(cost)`, no solution exists.

**2. Starting point**: If the running `tank` goes negative at index `i`, no station from `start` to `i` can be the answer — reset `start = i + 1` and `tank = 0`.

**Why?** If starting at any index `s ≤ i` caused us to fail at `i`, then starting anywhere between `s` and `i` would still face the same deficit (we'd have less gas going in). So we skip ahead to `i + 1`.

## Steps

1. `total = 0`, `tank = 0`, `start = 0`.
2. For each `i`:
   - `diff = gas[i] - cost[i]`.
   - `total += diff`, `tank += diff`.
   - If `tank < 0`: `start = i + 1`, `tank = 0`.
3. Return `total >= 0 ? start : -1`.

## Complexity
- Time: O(n)
- Space: O(1)
