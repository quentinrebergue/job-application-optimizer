# Subtree of Another Tree

Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a subtree of `root` with the same structure and node values as `subRoot`.

**Example 1:**
```
Input: root = [3,4,5,1,2], subRoot = [4,1,2]
Output: true
```

**Example 2:**
```
Input: root = [3,4,5,1,2,null,null,null,null,0], subRoot = [4,1,2]
Output: false
```

**Constraints:**
- The number of nodes in root is in the range [1, 2000]
- The number of nodes in subRoot is in the range [1, 1000]
- -10⁴ ≤ Node.val ≤ 10⁴
