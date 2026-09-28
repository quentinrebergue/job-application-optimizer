# Search in Rotated Sorted Array

There is an integer array `nums` sorted in ascending order that has been rotated at an unknown pivot index. Given `nums` and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not.

You must write an algorithm with **O(log n)** runtime.

**Example 1:**
```
Input:  nums = [4,5,6,7,0,1,2], target = 0
Output: 4
```

**Example 2:**
```
Input:  nums = [4,5,6,7,0,1,2], target = 3
Output: -1
```

**Example 3:**
```
Input:  nums = [1], target = 0
Output: -1
```

**Constraints:**
- 1 ≤ nums.length ≤ 5000
- -10⁴ ≤ nums[i] ≤ 10⁴
- All values of `nums` are unique
- `nums` is an ascending array rotated between 1 and n times
- -10⁴ ≤ target ≤ 10⁴