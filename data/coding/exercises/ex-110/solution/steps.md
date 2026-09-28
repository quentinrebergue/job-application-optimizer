# Solution Approach: Sort Starts and Ends Separately, Two-Pointer Sweep

## Pattern Recognition
→ **Intervals** — the number of rooms needed at any moment equals the number of meetings currently overlapping. Sorting all start times and all end times independently lets us sweep through both in chronological order and track that count directly.

## Steps

1. Extract and sort all start times, and separately all end times.
2. Use two pointers `s` and `e`, both starting at 0, and a running `rooms` counter.
3. While `s` hasn't consumed every start time:
   - If `starts[s] < ends[e]`, a new meeting begins before the earliest ongoing one ends: `rooms += 1`, advance `s`.
   - Otherwise, a meeting has ended: `rooms -= 1`, advance `e`.
   - Track `max_rooms = max(max_rooms, rooms)`.
4. Return `max_rooms`.

## Why This Works
Separating starts from ends and merging them chronologically (like a merge step in merge sort) simulates "walking through time": every start increments the room count, every end decrements it, and the peak of that running count is the maximum number of simultaneous meetings — exactly the rooms required.

## Complexity
- Time: O(n log n) — dominated by sorting the two arrays
- Space: O(n) for the sorted start/end arrays
