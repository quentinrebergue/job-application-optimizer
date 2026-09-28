# Split Array Largest Sum

Given an integer array `nums` and an integer `k`, split `nums` into `k` non-empty subarrays such that the **largest sum of any subarray is minimized**.

Return that minimized largest sum.

**Example 1:**
```
Input:  nums = [7,2,5,10,8], k = 2
Output: 18
Explanation: Split into [7,2,5] and [10,8] → max sum = 18.
```

**Example 2:**
```
Input:  nums = [1,2,3,4,5], k = 2
Output: 9
Explanation: Split into [1,2,3] and [4,5] → max sum = 9.
```

**Constraints:**
- `1 <= nums.length <= 1000`
- `0 <= nums[i] <= 10⁶`
- `1 <= k <= min(50, nums.length)`
