# Solution Approach: Find Middle, Reverse Second Half, Merge Alternately

## Pattern Recognition
→ **Fast & Slow Pointers** — the classic "find the middle" technique (fast pointer moves 2 steps for every 1 of slow) locates the split point, then two forward-only linked-list sub-routines finish the job.

## Steps

1. Find the middle of the list using fast/slow pointers (fast moves 2 steps, slow moves 1; when fast reaches the end, slow is at the middle).
2. Split the list into two halves at `slow`, and reverse the second half in place.
3. Merge the two halves by alternating nodes: take one node from the first half, then one from the reversed second half, repeating until both are exhausted.

## Why This Works
Finding the middle with fast/slow pointers avoids first counting the list's length in a separate pass. Once the list is split and the tail half is reversed, "first half forward + second half forward" is literally the target zig-zag order — merging one node at a time from each produces it directly.

## Complexity
- Time: O(n)
- Space: O(1) extra (all pointer rewiring, no auxiliary list)
