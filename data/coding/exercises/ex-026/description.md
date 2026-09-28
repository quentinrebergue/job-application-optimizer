# Task Scheduler

You are given an array of CPU tasks (each labeled A–Z) and a number `n`. Each CPU interval can be idle or complete one task. There must be a gap of **at least `n` intervals** between two tasks with the same label.

Return the **minimum number of CPU intervals** required to complete all tasks.

**Example 1:**
```
Input:  tasks = ["A","A","A","B","B","B"], n = 2
Output: 8
Sequence: A → B → idle → A → B → idle → A → B
```

**Example 2:**
```
Input:  tasks = ["A","C","A","B","D","B"], n = 1
Output: 6
```

**Example 3:**
```
Input:  tasks = ["A","A","A","B","B","B"], n = 3
Output: 10
```

**Constraints:**
- `1 <= tasks.length <= 10⁴`
- `tasks[i]` is an uppercase English letter
- `0 <= n <= 100`
