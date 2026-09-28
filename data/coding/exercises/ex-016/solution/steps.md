# Solution Approach: Fast & Slow Pointers (Gap Technique) + Dummy Node

## Pattern Recognition
→ **Fast & Slow Pointers on Linked List** — a singly linked list has no backward movement, so we can't index from the end directly. Instead, separate two node references by exactly n steps so when fast reaches the end, slow is right before the target node.

## Steps

1. Create a `dummy` node pointing to `head`. Start both `fast` and `slow` at `dummy`.
2. Advance `fast` exactly **n + 1** steps (the +1 positions slow just before the node to delete).
3. Move both `fast` and `slow` simultaneously until `fast == null`.
4. `slow.next` is the node to delete: `slow.next = slow.next.next`.
5. Return `dummy.next`.

## Why n + 1?
After advancing fast n+1 steps and then moving both until fast==null, slow lands at the node **before** the nth-from-end node. This lets us do the deletion in O(1) by adjusting the pointer.

## Why Dummy Node?
If we need to delete the head (n == list length), the dummy prevents a null-pointer edge case — `slow` starts at dummy, and deletion via `slow.next = slow.next.next` works uniformly.

## Complexity
- Time: O(L) — one pass through the list
- Space: O(1)
