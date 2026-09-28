# Scaled Dot-Product Attention

Implement the scaled dot-product attention mechanism used in Transformer models.

Given matrices `Q` (queries), `K` (keys), and `V` (values), compute:

```
Attention(Q, K, V) = softmax(Q · Kᵀ / √d_k) · V
```

Where `d_k` is the dimension of the key vectors (used for scaling to prevent vanishing gradients).

**Inputs:**
- `Q`: shape `(seq_len, d_k)` — query matrix
- `K`: shape `(seq_len, d_k)` — key matrix
- `V`: shape `(seq_len, d_v)` — value matrix
- `mask` (optional): boolean matrix of shape `(seq_len, seq_len)` — if provided, positions where `mask=True` should be set to `-inf` before the softmax (used for causal/autoregressive masking)

**Output:** shape `(seq_len, d_v)`

**Example:**
```python
import numpy as np
Q = np.array([[1.0, 0.0], [0.0, 1.0]])
K = np.array([[1.0, 0.0], [0.0, 1.0]])
V = np.array([[1.0, 2.0], [3.0, 4.0]])

out = attention(Q, K, V)
# out.shape == (2, 2)
```

**Follow-up questions you may be asked:**
- Why do we divide by √d_k?
- What is the causal mask and why is it needed for autoregressive generation?
- How does multi-head attention extend this?