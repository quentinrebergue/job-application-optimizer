**Pattern: Greedy Interval Sweep**

Three phases: (1) add all intervals ending before newInterval starts, (2) merge all overlapping intervals into newInterval, (3) add remaining. An interval overlaps if its start ≤ newInterval.end.
