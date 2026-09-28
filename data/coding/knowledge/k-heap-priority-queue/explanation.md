# Heap / Priority Queue

## Concept
A heap is a complete binary tree where every parent satisfies the heap property:
- **Min-heap**: parent ≤ children (top = minimum element)
- **Max-heap**: parent ≥ children (top = maximum element)

## Key Operations
| Operation | Time |
|-----------|------|
| Insert | O(log n) |
| Peek min/max | O(1) |
| Extract min/max | O(log n) |
| Build heap from array | O(n) |

## C++ — `priority_queue`

```cpp
#include <queue>

// Max-heap (default)
priority_queue<int> maxH;
maxH.push(3); maxH.push(1); maxH.push(4);
int top = maxH.top();  // 4
maxH.pop();

// Min-heap
priority_queue<int, vector<int>, greater<int>> minH;

// Custom comparator (min-heap of pairs by first element)
auto cmp = [](pair<int,int>& a, pair<int,int>& b) { return a.first > b.first; };
priority_queue<pair<int,int>, vector<pair<int,int>>, decltype(cmp)> pq(cmp);
```

## Patterns

### Top-K Largest Elements
Maintain a **min-heap of size K**. If current > heap.top(), pop and push.

```cpp
int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> minH;
    for (int n : nums) {
        minH.push(n);
        if ((int)minH.size() > k) minH.pop();
    }
    return minH.top();
}
```

### K-Way Merge
Push the head of each list into a min-heap; each pop gives the next smallest element, then push the next node from that list. O(N log k).

```cpp
// {value, list_idx, element_idx}
priority_queue<tuple<int,int,int>,
               vector<tuple<int,int,int>>,
               greater<>> pq;
for (int i = 0; i < k; i++)
    if (!lists[i].empty())
        pq.push({lists[i][0], i, 0});
```

### Sliding Window Maximum
Use a `deque` (monotone decreasing) for O(n): pop front if out of window, pop back while back < current.

## Complexity
- Push/pop: O(log n)
- Peek: O(1)
- Build from array: O(n)

## Classic Problems
- Merge k Sorted Lists, Kth Largest Element, Top K Frequent Elements, Task Scheduler, Find Median from Data Stream
