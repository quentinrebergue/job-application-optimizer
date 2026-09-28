def erase_overlap_intervals(intervals: list[list[int]]) -> int:
    intervals.sort(key=lambda x: x[1])

    kept, last_end = 1, intervals[0][1]

    for i in range(1, len(intervals)):
        if intervals[i][0] >= last_end:
            kept += 1
            last_end = intervals[i][1]

    return len(intervals) - kept
