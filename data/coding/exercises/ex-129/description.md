# Lowest Common Ancestor of a Binary Search Tree

Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes `p` and `q` in the BST.

The lowest common ancestor is defined as the lowest node that has both `p` and `q` as descendants (where a node can be a descendant of itself).

**Example 1:**
```
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
Output: 6
Explanation: The LCA of nodes 2 and 8 is 6.
```

**Example 2:**
```
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4
Output: 2
Explanation: The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself.
```

**Constraints:**
- The number of nodes is in the range [2, 10⁵]
- -10⁹ ≤ Node.val ≤ 10⁹
- All Node.val are unique
- p != q
- p and q will both exist in the BST
