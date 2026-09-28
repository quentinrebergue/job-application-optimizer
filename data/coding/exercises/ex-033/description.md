# Remove Duplicates from Sorted Array

Given a sorted integer array `nums`, remove the duplicates **in-place** such that each unique element appears **only once**. Return `k` — the number of unique elements.

The first `k` elements of `nums` must hold the result in sorted order. Beyond index `k`, values don't matter.

**Example 1:**
```
Input:  nums = [1,1,2]
Output: k = 2, nums = [1,2,_]
```

**Example 2:**
```
Input:  nums = [0,0,1,1,1,2,2,3,3,4]
Output: k = 5, nums = [0,1,2,3,4,_,_,_,_,_]
```

**Constraints:**
- `1 <= nums.length <= 3 × 10⁴`
- `-100 <= nums[i] <= 100`
- `nums` is sorted in non-decreasing order

> **See also:** ex-022 — Remove Duplicates II (each element allowed at most **twice**)
