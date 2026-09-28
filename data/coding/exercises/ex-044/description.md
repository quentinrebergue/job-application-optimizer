# Jump Game

You are given an integer array `nums`. You are initially positioned at index `0`. Each element `nums[i]` represents your **maximum jump length** at that position.

Return `true` if you can reach the last index, or `false` otherwise.

**Example 1:**
```
Input:  nums = [2,3,1,1,4]
Output: true
Explanation: Jump 1 step to index 1, then 3 steps to the last index.
```

**Example 2:**
```
Input:  nums = [3,2,1,0,4]
Output: false
Explanation: You always land on index 3 (nums[3]=0), which blocks progress.
```

**Constraints:**
- `1 <= nums.length <= 10⁴`
- `0 <= nums[i] <= 10⁵`
