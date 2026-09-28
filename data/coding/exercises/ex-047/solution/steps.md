# Solution Approach: Greedy + Sorted Frequency Map

## Pattern Recognition
→ **Greedy** — always start a new group from the smallest available card. If the required consecutive sequence can't be formed, return false.

## Steps

1. If `hand.length % groupSize !== 0`: return `false`.
2. Build `freq: Map<number, count>` from `hand`. Sort unique keys.
3. For each key `card` in sorted order (ascending):
   - While `freq.get(card) > 0`:
     - Try to form a group starting at `card`: for `j` from 0 to `groupSize - 1`:
       - If `freq.get(card + j) === 0`: return `false`.
       - Decrement `freq.get(card + j)`.
4. Return `true`.

## Why Greedy Works
If the smallest available card `c` exists, it **must** start a group (nothing smaller can include it). If we can't form a group starting at `c`, the answer is false. We never need to consider using `c` in a later group.

## Optimization
Use a sorted map (or sort keys once) to always access the minimum in O(log n). With a `Map` + sorted keys array, the inner loop is O(groupSize).

## Complexity
- Time: O(n log n) — sorting
- Space: O(n)
