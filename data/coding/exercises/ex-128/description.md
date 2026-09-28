# Validate Binary Search Tree

Given the `root` of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with values strictly less than the node's value.
- The right subtree of a node contains only nodes with values strictly greater than the node's value.
- Both the left and right subtrees must also be valid binary search trees.

**Example 1:**
```
Input: root = [2,1,3]
Output: true
```

**Example 2:**
```
Input: root = [5,1,4,null,null,3,6]
Output: false
Explanation: The root's value is 5, but its right child's left child is 3, which is less than 5.
```

**Constraints:**
- The number of nodes is in the range [1, 10⁴]
- -2³¹ ≤ Node.val ≤ 2³¹ - 1
