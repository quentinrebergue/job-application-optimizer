# Merge k Sorted Lists

You are given an array of `k` linked-lists, each sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.

**Example 1:**
```
Input:  lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]
```

**Example 2:**
```
Input:  lists = []
Output: []
```

**Example 3:**
```
Input:  lists = [[]]
Output: []
```

**Constraints:**
- `k == lists.length`
- `0 <= k <= 10⁴`
- `0 <= lists[i].length <= 500`
- `-10⁴ <= lists[i][j] <= 10⁴`
- Each list is sorted in ascending order
- Total nodes ≤ 10⁴