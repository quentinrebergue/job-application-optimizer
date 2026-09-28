# Non-overlapping Intervals

Given an array of intervals, return the **minimum number of intervals to remove** to make the rest non-overlapping.

Intervals that touch at a single point are considered non-overlapping (e.g. `[1,2]` and `[2,3]`).

**Example 1:**
```
Input:  intervals = [[1,2],[2,3],[3,4],[1,3]]
Output: 1
Explanation: Remove [1,3]; the rest are non-overlapping.
```

**Example 2:**
```
Input:  intervals = [[1,2],[1,2],[1,2]]
Output: 2
```

**Example 3:**
```
Input:  intervals = [[1,2],[2,3]]
Output: 0
```

**Constraints:**
- `1 <= intervals.length <= 10⁵`
- `-5 × 10⁴ <= start < end <= 5 × 10⁴`
