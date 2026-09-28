# Solution Approach: Dynamic Programming (Fibonacci)

## Pattern Recognition
→ **1D DP** — the number of ways to reach step n is the sum of ways to reach n-1 (last step was 1) and n-2 (last step was 2). This is the Fibonacci recurrence.

## Steps

1. Base cases: `ways(1) = 1`, `ways(2) = 2`.
2. For each step `i` from 3 to n: `ways(i) = ways(i-1) + ways(i-2)`.
3. Optimize to O(1) space: only keep the last two values.

```
n=1: 1
n=2: 2
n=3: 1+2=3
n=4: 2+3=5  ← Fibonacci shifted by 1
```

## Complexity
- Time: O(n)
- Space: O(1) with two variables
