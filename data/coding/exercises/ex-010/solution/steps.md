# Solution Approach: Scaled Dot-Product Attention

## Steps

1. **Compute raw scores**: `scores = Q @ K.T` — shape `(seq_len, seq_len)`. Each entry `scores[i,j]` measures how much query `i` attends to key `j`.

2. **Scale**: `scores /= sqrt(d_k)`. Without scaling, the dot products grow large for high `d_k`, pushing softmax into saturation (near-zero gradients).

3. **Apply mask (optional)**: Set `scores[mask] = -inf` so those positions become 0 after softmax. This is the causal mask for autoregressive generation.

4. **Softmax**: `weights = softmax(scores, axis=-1)` — shape `(seq_len, seq_len)`. Each row is a probability distribution over positions.

5. **Weighted sum of values**: `output = weights @ V` — shape `(seq_len, d_v)`.

## Why √d_k Scaling?
If Q and K entries are drawn from N(0,1), their dot product has variance `d_k`. Dividing by `√d_k` normalizes it back to variance 1, keeping softmax inputs in a useful gradient range.

## Causal Mask
For decoder-only models (GPT, Mistral), position `i` must not see positions `j > i`. The mask is an upper-triangular matrix of `True` values.

## Complexity
- Time: O(seq_len² × d_k) for the matmul
- Space: O(seq_len²) for the attention matrix