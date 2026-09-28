import numpy as np


def softmax(x: np.ndarray) -> np.ndarray:
    x_shifted = x - x.max(axis=-1, keepdims=True)
    exp_x = np.exp(x_shifted)
    return exp_x / exp_x.sum(axis=-1, keepdims=True)


def scaled_dot_product_attention(
    Q: np.ndarray,  # (seq_len, d_k)
    K: np.ndarray,  # (seq_len, d_k)
    V: np.ndarray,  # (seq_len, d_v)
    mask: np.ndarray | None = None,  # (seq_len, seq_len), True = ignore
) -> np.ndarray:
    d_k = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d_k)  # (seq_len, seq_len)
    if mask is not None:
        scores = np.where(mask, -np.inf, scores)
    weights = softmax(scores)  # (seq_len, seq_len)
    return weights @ V  # (seq_len, d_v)


# Causal mask (decoder / autoregressive)
def causal_mask(seq_len: int) -> np.ndarray:
    return np.triu(np.ones((seq_len, seq_len), dtype=bool), k=1)
