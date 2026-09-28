# Count Number of Nice Subarrays

Given an array of integers `nums` and an integer `k`, a subarray is **nice** if there are exactly `k` odd numbers in it.

Return the **number of nice subarrays**.

**Example 1:**
```
Input:  nums = [1,1,2,1,1], k = 3
Output: 2
Explanation: [1,1,2,1] and [1,2,1,1].
```

**Example 2:**
```
Input:  nums = [2,4,6], k = 1
Output: 0
```

**Example 3:**
```
Input:  nums = [2,2,2,1,2,2,1,2,2,2], k = 2
Output: 16
```

**Constraints:**
- `1 <= nums.length <= 50000`
- `1 <= nums[i] <= 10⁵`
- `1 <= k <= nums.length`
