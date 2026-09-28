# Solution Approach: Greedy Two Pointers

## Pattern Recognition
→ **Two Pointers + Greedy** — sort tokens; greedily buy cheap tokens face-up (to gain score) and sell the most expensive one face-down when stuck (to regain power).

## Steps

1. Sort `tokens` ascending.
2. `left = 0`, `right = tokens.length - 1`, `maxScore = 0`.
3. While `left <= right`:
   - If `power >= tokens[left]`: play face-up → `power -= tokens[left++]`, `score++`, update `maxScore`.
   - Else if `score >= 1 && left < right`: play face-down (sell most expensive) → `power += tokens[right--]`, `score--`.
   - Else: break (can't do anything useful).
4. Return `maxScore`.

## Why Sell the Most Expensive?
To maximize future face-up plays, we want to regain as much power as possible — the rightmost (highest-value) token gives the most power per score point spent.

## Why Track maxScore Separately?
Score can go down (face-down play). `maxScore` captures the peak before any trade-off.

## Complexity
- Time: O(n log n) for sort, O(n) for the scan
- Space: O(1)
