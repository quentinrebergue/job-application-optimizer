# House Robber II

You are a professional robber planning to rob houses along a street, but this time the houses are arranged in a **circle** — the first and last houses are adjacent to each other. As before, you cannot rob two adjacent houses.

Return the maximum amount of money you can rob without alerting the police.

**Example 1:**
```
Input: nums = [2,3,2]
Output: 3
Explanation: You cannot rob house 1 and house 3 since they are adjacent; rob house 2 instead.
```

**Example 2:**
```
Input: nums = [1,2,3,1]
Output: 4
Explanation: Rob house 1 and house 3. Total = 1 + 3 = 4.
```

**Constraints:**
- 1 ≤ nums.length ≤ 100
- 0 ≤ nums[i] ≤ 1000
