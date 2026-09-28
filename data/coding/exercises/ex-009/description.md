# Implement Softmax from Scratch

Implement the `softmax` function that converts a vector of raw scores (logits) into a probability distribution.

The formula is:

```
softmax(x)_i = exp(x_i) / Σ exp(x_j)
```

Your implementation must:
1. Work on a 1D array of floats
2. Be numerically stable (handle large values without overflow)
3. Return values that sum to 1.0

**Example:**
```python
softmax([1.0, 2.0, 3.0])
# → [0.0900, 0.2447, 0.6652]  (approximately)

softmax([1000.0, 1001.0, 1002.0])
# → [0.0900, 0.2447, 0.6652]  (same result — numerically stable)
```

**Bonus:** Extend to work on a 2D matrix, applying softmax row-wise (as used in attention).

**Constraints:**
- Input contains at least one element
- Values can be very large or very negative — your implementation must not produce NaN or Inf