# Solution Approach: Dummy Node + Skip Duplicates

## Pattern Recognition
→ **Linked List with Dummy Head** — use a `prev` pointer that only advances past nodes that are NOT duplicated.

## Steps

1. Create `dummy` node → `dummy.next = head`. Set `prev = dummy`.
2. While `head !== null`:
   - If `head.next !== null && head.val === head.next.val`:
     - Skip all nodes with this value: advance `head` while `head.next !== null && head.val === head.next.val`.
     - Skip the last duplicate too: `prev.next = head.next`.
   - Else: `prev = prev.next` (this node is distinct, advance `prev`).
   - `head = head.next`.
3. Return `dummy.next`.

## Why Not Advance `prev` When Skipping?
`prev` must stay at the last confirmed-distinct node. When we encounter duplicates, we skip all of them without moving `prev`, so the link bypasses the entire duplicate group.

## Complexity
- Time: O(n)
- Space: O(1)
