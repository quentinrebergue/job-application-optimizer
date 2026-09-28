# Find Median from Data Stream

Design a data structure that supports adding integers from a stream and finding the median of all integers added so far.

Implement the `MedianFinder` class:
- `MedianFinder()` initializes the object.
- `void addNum(int num)` adds `num` to the data structure.
- `double findMedian()` returns the median of all elements added so far. Answers within `10⁻⁵` of the actual answer are accepted.

**Example:**
```
Input:
["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"]
[[], [1], [2], [], [3], []]
Output:
[null, null, null, 1.5, null, 2.0]
```

**Constraints:**
- -10⁵ ≤ num ≤ 10⁵
- At most 5 × 10⁴ calls total will be made to addNum and findMedian
- findMedian will only be called after at least one call to addNum
