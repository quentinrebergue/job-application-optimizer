# Design a Rate Limiter

Design a rate limiter that restricts API clients to a maximum number of requests per time window. This is a classic system design question.

## Requirements

**Functional:**
- Allow at most `N` requests per user per time window `T`
- Requests beyond the limit are rejected with HTTP 429

**Non-Functional:**
- Low latency (< 5ms overhead per request)
- Horizontally scalable (multiple API server instances)
- Resilient (rate limiter failure should not bring down the API)

## Questions to Address

1. **Algorithm choice**: compare Token Bucket, Leaky Bucket, Fixed Window Counter, and Sliding Window Log. Which do you choose and why?

2. **Storage**: where do you store counters? (in-memory per server vs. centralized Redis) — trade-offs?

3. **Distributed consistency**: how do you prevent users from bypassing the limit by hitting different servers?

4. **Race conditions**: how do you handle concurrent requests from the same user?

5. **Failure mode**: what happens if Redis goes down?

## Scope
- Rate limit per user (identified by API key or user ID)
- Limit: 100 requests per minute
- Expected scale: 10,000 users, peak 50,000 req/s total