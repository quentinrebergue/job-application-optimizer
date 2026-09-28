# Transformer Architecture

## Overview
Introduced in "Attention Is All You Need" (Vaswani et al., 2017). Replaces recurrence with self-attention, enabling full parallelism during training.

## Key Components

### 1. Tokenization + Embeddings
Input text → token IDs → dense embedding vectors of dimension `d_model`.

### 2. Positional Encoding
Since attention has no notion of order, position information is injected:
- Fixed sinusoidal (original paper)
- Learned (BERT, GPT-2)
- Rotary (RoPE, used by LLaMA/Mistral)

### 3. Multi-Head Self-Attention
```
Q = X·W_Q,  K = X·W_K,  V = X·W_V
Attention(Q, K, V) = softmax(Q·Kᵀ / √d_k) · V
```
Multiple heads run in parallel, each learning different relationships. Outputs are concatenated and projected.

### 4. Feed-Forward Network (FFN)
Applied position-wise after attention:
```
FFN(x) = GELU(x·W₁ + b₁)·W₂ + b₂
```
Typically d_ff = 4 × d_model.

### 5. Layer Normalization & Residual Connections
Each sub-layer: `output = LayerNorm(x + sublayer(x))` (Pre-LN variant is more stable for deep models).

### 6. Decoder Specifics
- **Causal mask**: prevents attending to future tokens (autoregressive generation)
- **KV cache**: during inference, cache K and V of past tokens to avoid recomputation

## Mistral-Specific Innovations
- **Grouped Query Attention (GQA)**: multiple query heads share a single KV head → reduces KV cache memory
- **Sliding Window Attention (SWA)**: each token attends to a fixed window of past tokens → O(n·w) instead of O(n²)
- **RoPE** positional encoding for better extrapolation to longer sequences

## Complexity
- Self-attention: O(n² · d) — quadratic in sequence length
- With sliding window: O(n · w · d)

## Key Numbers (Mistral 7B)
- 32 layers, d_model = 4096, 32 query heads, 8 KV heads (GQA), context = 8k (SWA)