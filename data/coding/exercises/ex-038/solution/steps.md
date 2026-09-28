# Solution Approach: Variable Sliding Window + Max Frequency

## Pattern Recognition
→ **Variable Sliding Window** — a window is valid if we can replace all non-dominant characters within `k` operations.

## Key Insight
`windowLen - maxFreqInWindow <= k` → the window is valid. We only need to replace characters that are NOT the most frequent one.

## Steps

1. `freq = new Array(26).fill(0)`, `maxFreq = 0`, `left = 0`, `result = 0`.
2. For `right` from 0 to n-1:
   - Increment `freq[s[right]]`, update `maxFreq = max(maxFreq, freq[s[right]])`.
   - Window length: `right - left + 1`. If `windowLen - maxFreq > k`: invalid → shrink left, decrement `freq[s[left]]`, `left++`.
   - `result = max(result, right - left + 1)`.
3. Return `result`.

## Why Not Update maxFreq When Shrinking?
`maxFreq` is only allowed to increase — we never need to shrink it, because a smaller `maxFreq` would only produce a smaller valid window. We're tracking the best possible window, so monotonically increasing `maxFreq` is safe.

## Complexity
- Time: O(n)
- Space: O(26) = O(1)
