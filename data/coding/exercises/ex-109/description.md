# Meeting Rooms

Given an array of meeting time intervals `intervals` where `intervals[i] = [starti, endi]`, determine if a person could attend all meetings (i.e. no two intervals overlap).

**Example 1:**
```
Input: intervals = [[0,30],[5,10],[15,20]]
Output: false
Explanation: [0,30] overlaps with both [5,10] and [15,20].
```

**Example 2:**
```
Input: intervals = [[7,10],[2,4]]
Output: true
```

**Constraints:**
- 0 ≤ intervals.length ≤ 10⁴
- intervals[i].length == 2
- 0 ≤ starti < endi ≤ 10⁶
