# Solution Approach: Greedy (Track Minimum So Far)

## Pattern Recognition
→ **Greedy** — scan once while keeping the lowest price seen so far; the best profit at any day is today's price minus that running minimum. Committing to "buy at the cheapest point seen" is always safe — it never precludes a better future sale.

## Steps

1. Initialize `min_price = infinity`, `max_profit = 0`.
2. For each `price` in `prices`:
   - Update `min_price = min(min_price, price)`.
   - Update `max_profit = max(max_profit, price - min_price)`.
3. Return `max_profit`.

## Why This Works
At each day, the best possible sale is "sell today, having bought at the cheapest price so far." We never need to reconsider an earlier buy decision — the running minimum already captures the best possible buy point up to now.

## Complexity
- Time: O(n)
- Space: O(1)
