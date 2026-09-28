# Arithmetic Slices

An array is **arithmetic** if it has at least 3 elements and every two consecutive elements have the same difference.

Given an integer array `nums`, return the **number of arithmetic subarrays**.

**Example 1:**
```
Input:  nums = [1,2,3,4]
Output: 3
Explanation: [1,2,3], [2,3,4], [1,2,3,4]
```

**Example 2:**
```
Input:  nums = [1]
Output: 0
```

**Constraints:**
- `1 <= nums.length <= 5000`
- `-1000 <= nums[i] <= 1000`
