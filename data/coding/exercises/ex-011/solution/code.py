# Token Bucket rate limiter — in-memory single-process implementation
# For distributed use, replace the store with Redis + a Lua script (see steps.md)

import time


class RateLimiter:
    def __init__(self, capacity: int, window_seconds: float):
        self.capacity = capacity
        self.refill_rate_per_sec = capacity / window_seconds
        self.buckets: dict[str, tuple[float, float]] = {}  # user_id -> (tokens, last_refill)

    def allow(self, user_id: str) -> bool:
        now = time.monotonic()
        tokens, last_refill = self.buckets.get(user_id, (self.capacity, now))

        elapsed = now - last_refill
        tokens = min(self.capacity, tokens + elapsed * self.refill_rate_per_sec)

        if tokens >= 1:
            tokens -= 1
            self.buckets[user_id] = (tokens, now)
            return True

        self.buckets[user_id] = (tokens, now)
        return False


# Usage:
# limiter = RateLimiter(100, 60)  # 100 req/min
# if not limiter.allow(user_id):
#     raise TooManyRequests()
