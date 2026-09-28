**Pattern: Prefix Sum**

Build a prefix sum array `pre` where `pre[i] = nums[0]+...+nums[i-1]`. Then `sumRange(l,r) = pre[r+1] - pre[l]` in O(1).

Key insight: pre-compute cumulative sums at construction time so each query is O(1) instead of O(n).
