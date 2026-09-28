# House Robber

You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, given in `nums`. Adjacent houses have connected security systems, so you cannot rob two adjacent houses on the same night.

Return the maximum amount of money you can rob without alerting the police.

**Example 1:**
```
Input: nums = [1,2,3,1]
Output: 4
Explanation: Rob house 1 (money = 1) and house 3 (money = 3). Total = 1 + 3 = 4.
```

**Example 2:**
```
Input: nums = [2,7,9,3,1]
Output: 12
Explanation: Rob house 1, 3, and 5. Total = 2 + 9 + 1 = 12.
```

**Constraints:**
- 1 ≤ nums.length ≤ 100
- 0 ≤ nums[i] ≤ 400
