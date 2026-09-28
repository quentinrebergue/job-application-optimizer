# Reverse Nodes in k-Group

Given the `head` of a linked list, reverse the nodes of the list `k` at a time, and return the modified list.

`k` is a positive integer ≤ length of the linked list. If the number of nodes is not a multiple of `k`, the left-over nodes at the end should remain as-is.

You may **not alter the values** in the list's nodes — only the nodes themselves may be changed.

**Example 1:**
```
Input:  head = [1,2,3,4,5], k = 2
Output: [2,1,4,3,5]
```

**Example 2:**
```
Input:  head = [1,2,3,4,5], k = 3
Output: [3,2,1,4,5]
```

**Constraints:**
- Number of nodes: `n`
- `1 <= k <= n <= 5000`
- `0 <= Node.val <= 1000`

**Follow-up:** Can you solve this in O(1) extra memory?
