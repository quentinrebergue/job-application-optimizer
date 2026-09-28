# Solution Approach: Numerically Stable Softmax

## The Naive Problem
`exp(1000)` overflows to `Inf` in float32/float64. Dividing `Inf / Inf` gives `NaN`.

## Stability Trick
Subtract the maximum value before exponentiating. This doesn't change the result mathematically:

```
softmax(x)_i = exp(x_i - max(x)) / Σ exp(x_j - max(x))
```

Proof: `exp(x_i - C) / Σ exp(x_j - C) = exp(x_i)·exp(-C) / (Σ exp(x_j)·exp(-C)) = exp(x_i) / Σ exp(x_j)`

## Steps

1. Compute `x_shifted = x - max(x)` (now max is 0, all values ≤ 0).
2. Compute `exp_x = exp(x_shifted)` — no overflow since values are ≤ 0.
3. Return `exp_x / sum(exp_x)`.

## 2D Extension
Apply the same trick row-wise: subtract `max` per row, normalize per row.

## Complexity
- Time: O(n)
- Space: O(n)