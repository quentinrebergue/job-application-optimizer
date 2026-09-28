# Remove Duplicates from Sorted Array II

Given a sorted integer array `nums`, remove duplicates **in-place** such that each unique element appears **at most twice**. Return `k` — the count of remaining elements.

The first `k` elements of `nums` must hold the result. Beyond index `k`, values don't matter.

**Example 1:**
```
Input:  nums = [1,1,1,2,2,3]
Output: k = 5, nums = [1,1,2,2,3,_]
```

**Example 2:**
```
Input:  nums = [0,0,1,1,1,1,2,3,3]
Output: k = 7, nums = [0,0,1,1,2,3,3,_,_]
```

**Constraints:**
- `1 <= nums.length <= 3 × 10⁴`
- `-10⁴ <= nums[i] <= 10⁴`
- `nums` is sorted in non-decreasing order
