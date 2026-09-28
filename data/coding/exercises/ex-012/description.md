# Design an LLM Inference Service

Design a production inference service for a large language model like Mistral 7B that serves text generation requests via an API.

## Requirements

**Functional:**
- Accept a prompt (text) and return a generated completion
- Support streaming (tokens returned as they are generated)
- Support multiple concurrent users

**Non-Functional:**
- Latency: time-to-first-token (TTFT) < 500ms at p99
- Throughput: serve 100 concurrent users on a single A100 GPU node
- Availability: 99.9% uptime

## Questions to Address

1. **Batching**: how do you maximize GPU utilization across concurrent requests? What is continuous batching (also called iteration-level scheduling)?

2. **KV cache**: what is it, why does it matter for inference latency, and how does it constrain memory?

3. **Model parallelism**: when does a single GPU not suffice? Explain tensor parallelism vs. pipeline parallelism.

4. **Quantization**: what is INT8/INT4 quantization, and what do you trade off?

5. **Autoscaling**: how do you scale the service under variable load? How is GPU autoscaling different from CPU autoscaling?

6. **Request queue**: how do you handle traffic spikes gracefully?

## Scope
- Model: Mistral 7B (7 billion parameters, ~14GB in fp16)
- Hardware: NVIDIA A100 80GB
- API: REST + Server-Sent Events (SSE) for streaming