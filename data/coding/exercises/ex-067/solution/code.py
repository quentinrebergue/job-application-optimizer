def insert(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]:
    res = []
    i = 0
    n = len(intervals)

    while i < n and intervals[i][1] < new_interval[0]:
        res.append(intervals[i])
        i += 1
    while i < n and intervals[i][0] <= new_interval[1]:
        new_interval[0] = min(new_interval[0], intervals[i][0])
        new_interval[1] = max(new_interval[1], intervals[i][1])
        i += 1
    res.append(new_interval)
    while i < n:
        res.append(intervals[i])
        i += 1
    return res
