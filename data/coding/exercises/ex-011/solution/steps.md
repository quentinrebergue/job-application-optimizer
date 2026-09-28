# Solution: Rate Limiter Design

## Algorithm Choice: Sliding Window Counter
Best balance of accuracy and efficiency. Combines the simplicity of a fixed window with protection against boundary bursts.

**Fixed Window** flaw: a user can send 100 req in the last second of minute 1 and 100 req in the first second of minute 2 → 200 req in 2 seconds.

**Sliding Window Counter** fix: `count = current_window_count + previous_window_count × (remaining fraction of previous window)`.

For most APIs, Token Bucket is the industry standard (used by AWS, Stripe) — it naturally smooths bursts and is easy to implement with Redis.

## Architecture

```
Client → API Gateway → Rate Limiter Middleware → Backend Service
                             ↕
                           Redis
```

### Redis Data Model (Token Bucket)
```
Key: rate_limit:{user_id}
Fields:
  tokens: float   (current token count)
  last_refill: timestamp
TTL: window_size (auto-cleanup)
```

### Algorithm: Token Bucket with Redis Lua Script
```lua
-- Atomic check-and-update (runs server-side, no race condition)
local key = KEYS[1]
local capacity = tonumber(ARGV[1])     -- 100
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

local elapsed = now - last_refill
tokens = math.min(capacity, tokens + elapsed * refill_rate)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 120)
  return 1  -- allowed
else
  return 0  -- rejected
end
```

## Distributed Consistency
- Use a **single Redis instance** (or Redis Cluster) as the shared counter store.
- Lua scripts are atomic — no race conditions.
- All API server instances hit the same Redis → consistent global rate limiting.

## Failure Mode
- Use a **circuit breaker**: if Redis is unreachable, fail open (allow requests) to avoid bringing down the API. Log the incident.
- For stricter security, fail closed (reject all) — depends on business requirement.

## Headers to Return
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 43
X-RateLimit-Reset: 1717459200
Retry-After: 15   (on 429)
```

## Scale
- 50,000 req/s → Redis can handle ~100k ops/s on a single instance. Fine.
- For higher scale: Redis Cluster with consistent hashing on user_id.