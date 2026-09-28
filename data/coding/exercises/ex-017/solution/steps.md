# Solution Approach: Divide and Conquer

## Pattern Recognition
→ **Divide and Conquer** — recursively merge pairs of lists; each level halves the problem. Total O(N log k) where N = total nodes, k = number of lists.

## Steps

1. If `lists` is empty, return `null`. If one list, return it.
2. `mergeKLists(lists)`:
   - While `lists.length > 1`, iterate in pairs and merge each pair with `mergeTwoLists`.
   - Collect results into a new array and repeat until one list remains.
3. `mergeTwoLists(l1, l2)`: standard merge of two sorted lists using a dummy head.

## Why Not Min-Heap?
Min-heap: O(N log k) time, O(k) space for heap. Also correct — push all heads, pop min, push next.
Divide and conquer: O(N log k) time, O(log k) space for recursion stack. Both are optimal time.

## Complexity
- Time: O(N log k) — log k merge levels, each level processes all N nodes
- Space: O(log k) for recursion (iterative version: O(1))
