# Solution Approach: Fixed Window + Frequency Arrays

## Pattern Recognition
→ **Fixed Sliding Window (size s1.length)** — same technique as ex-039, but return a boolean.

## Steps

1. If `s1.length > s2.length`, return `false`.
2. Build `need[26]` from `s1`. Build `window[26]` from `s2[0..s1.length-1]`.
3. If `need` equals `window`: return `true`.
4. Slide right from `s1.length` to `s2.length - 1`:
   - Add incoming char, remove outgoing char.
   - If arrays match: return `true`.
5. Return `false`.

## Early Exit
Return as soon as a match is found — no need to scan the whole string.

## Complexity
- Time: O(n × 26) = O(n)
- Space: O(26) = O(1)
