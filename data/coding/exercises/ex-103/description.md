# Course Schedule

There are `numCourses` courses labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` before course `a`.

Return `true` if you can finish all courses, or `false` if it's impossible (i.e. there's a cycle).

**Example 1:**
```
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true
Explanation: Take course 0, then course 1.
```

**Example 2:**
```
Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false
Explanation: Course 0 needs course 1, and course 1 needs course 0 — a cycle, so it's impossible.
```

**Constraints:**
- 1 ≤ numCourses ≤ 2000
- 0 ≤ prerequisites.length ≤ 5000
- prerequisites[i].length == 2
- 0 ≤ ai, bi < numCourses
- All the pairs prerequisites[i] are unique
