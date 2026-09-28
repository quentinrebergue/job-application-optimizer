# Solution Approach: Walk Both Lists Forward with a Dummy Head

## Pattern Recognition
→ **Fast & Slow Pointers** — a singly linked list has no backward movement, so any technique that walks it using multiple node references (here, one pointer per list, plus a build pointer) falls under this family rather than "Two Pointers," which is reserved for arrays/strings where both ends are directly reachable.

## Steps

1. Create a `dummy` node to anchor the result, and a `curr` pointer starting at `dummy`.
2. While both `list1` and `list2` are non-null:
   - Compare their values; splice the smaller node onto `curr.next`, and advance that list's pointer.
   - Advance `curr`.
3. Once one list is exhausted, splice the remainder of the other list directly onto `curr.next` (it's already sorted).
4. Return `dummy.next`.

## Why This Works
Both input lists are already sorted, so at every step the smaller of the two current heads is guaranteed to be the next-smallest value overall — no need to look further ahead. The dummy node avoids special-casing the very first splice.

## Complexity
- Time: O(n + m)
- Space: O(1) extra (reuses existing nodes)
