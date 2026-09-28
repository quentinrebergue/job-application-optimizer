**Pattern: Binary Search on Rotated Array**

If `nums[mid] > nums[r]`, the minimum is in the right half (rotation point is there). Otherwise it's in the left half (including mid). Narrow until l == r.
