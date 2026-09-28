# Minimum Size Subarray Sum

Given an array of positive integers `nums` and a positive integer `target`, return the **minimal length** of a subarray whose sum is **≥ target**. If no such subarray exists, return `0`.

**Example 1:**
```
Input:  target = 7, nums = [2,3,1,2,4,3]
Output: 2
Explanation: [4,3] has sum 7, length 2.
```

**Example 2:**
```
Input:  target = 4, nums = [1,4,4]
Output: 1
```

**Example 3:**
```
Input:  target = 11, nums = [1,1,1,1,1,1,1,1]
Output: 0
```

**Constraints:**
- `1 <= target <= 10⁹`
- `1 <= nums.length <= 10⁵`
- `1 <= nums[i] <= 10⁴`

**Follow-up:** O(n) solution exists. Can you also find an O(n log n) solution?
