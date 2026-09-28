# Solution Approach: Iterative Group Reversal

## Pattern Recognition
→ **Linked List Manipulation** — reverse exactly k nodes at a time, reconnect each reversed group to the chain.

## Steps

1. Use a `dummy` node before head; set `groupPrev = dummy`.
2. Repeat:
   a. Find the k-th node from `groupPrev.next` by walking k steps. If fewer than k nodes remain, stop.
   b. Let `groupStart = groupPrev.next`, `groupEnd = kth node`.
   c. Save `nextGroup = groupEnd.next`, then sever the group: `groupEnd.next = null`.
   d. Reverse the group (standard reversal returns new head = old tail).
   e. Reconnect: `groupPrev.next = reversed head`, `groupStart.next = nextGroup`.
   f. Advance `groupPrev = groupStart` (which is now the tail of the reversed group).
3. Return `dummy.next`.

## Complexity
- Time: O(n) — each node is visited at most twice
- Space: O(1) — no recursion, no extra data structures
