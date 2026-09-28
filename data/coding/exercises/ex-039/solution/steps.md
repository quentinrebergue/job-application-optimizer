# Solution Approach: Fixed Window + Frequency Arrays

## Pattern Recognition
→ **Fixed Sliding Window (size p.length)** — slide a window of exactly `p.length` over `s`, comparing character frequency arrays.

## Steps

1. Build `pFreq[26]` from `p`. Build `wFreq[26]` from the first window `s[0..p.length-1]`.
2. If `pFreq` equals `wFreq`: push `0` to result.
3. Slide right from `p.length` to `s.length - 1`:
   - Add `s[right]` to `wFreq`, remove `s[right - p.length]` from `wFreq`.
   - If arrays match: push `right - p.length + 1` to result.
4. Return result.

## Array Comparison O(26) vs Map
Using fixed 26-element integer arrays instead of Maps makes equality checks O(26) = O(1). This is the classic optimization for fixed-alphabet problems.

## Relation to ex-040 (Permutation in String)
Identical approach — just return `result.length > 0` instead of the indices array.

## Complexity
- Time: O(n × 26) = O(n)
- Space: O(26) = O(1)
