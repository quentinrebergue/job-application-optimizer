# Solution: LLM Inference Service Design

## High-Level Architecture

```
Client
  ↓ HTTP (REST / SSE)
Load Balancer
  ↓
API Service (stateless, multiple pods)
  ↓ gRPC
Inference Workers (GPU pods — vLLM or TGI)
  ↓
Model weights on shared NFS / object store
```

## Key Concepts

### 1. Continuous Batching (Iteration-Level Scheduling)
Naive batching waits for the slowest request. Continuous batching inserts new requests into the batch at each decode step, as soon as a slot frees up. Result: GPU stays saturated, TTFT is low.

Used by: vLLM, TGI (Text Generation Inference by Hugging Face — Mistral's open-source serving stack).

### 2. KV Cache
During autoregressive generation, keys and values of past tokens are cached to avoid recomputation. For Mistral 7B on A100 80GB:
- Model weights: ~14GB (fp16)
- KV cache: up to ~60GB remaining → limits max concurrent sequences and context length
- PagedAttention (vLLM): manages KV cache like virtual memory pages to eliminate fragmentation

### 3. Model Parallelism
Mistral 7B fits on a single A100 80GB. For larger models:
- **Tensor Parallelism**: split each weight matrix across GPUs (same layer, different devices). Low latency, high bandwidth needed.
- **Pipeline Parallelism**: assign different layers to different GPUs. Higher throughput but pipeline bubble latency.

### 4. Quantization
| Precision | Size | Quality |
|-----------|------|---------|
| fp16 | 14GB | Full |
| INT8 | 7GB | ~Equal |
| INT4 (GPTQ/AWQ) | 3.5GB | Small regression |

INT8 is a free lunch. INT4 allows 2× more concurrent requests at a small quality cost.

### 5. Streaming (SSE)
- Generate tokens one at a time server-side
- Flush each token to the client via SSE (`data: {"token": "..."}\n\n`)
- Client perceives fast response even for long completions

### 6. Autoscaling
- GPU pods are expensive — scale to 0 when idle, scale up slowly (pod startup + model load ~2min)
- Use a **request queue** (SQS, Redis Streams) as a buffer during scale-up
- Pre-warm a minimum number of pods at all times to meet TTFT SLA

## Failure Modes
- GPU OOM: reject request with 503, log, alert
- Inference timeout: cancel generation, return partial response or error
- Pod failure: load balancer reroutes; stateless design ensures no data loss

## Numbers
| Metric | Value |
|--------|-------|
| Mistral 7B, A100 80GB, fp16 | ~1200 tokens/s (batch=32) |
| KV cache per request (2k ctx) | ~512MB |
| Max concurrent requests (A100) | ~8–16 |
| TTFT target | < 500ms |