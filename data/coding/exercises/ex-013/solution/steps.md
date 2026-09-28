# Solution Approach: Binary Search on Partition

## Pattern Recognition
→ **Binary Search** — O(log(m+n)) forces a binary search; we search for the correct partition, not a value.

## Key Idea
The median splits the combined sorted array into two equal halves. If we partition `nums1` at index `i` and `nums2` at index `j = (m+n+1)/2 - i`, then:
- left half = `nums1[0..i-1]` + `nums2[0..j-1]`
- right half = `nums1[i..m-1]` + `nums2[j..n-1]`

The partition is correct when:
- `nums1[i-1] <= nums2[j]`  (left of nums1 ≤ right of nums2)
- `nums2[j-1] <= nums1[i]`  (left of nums2 ≤ right of nums1)

## Steps

1. Ensure `nums1` is the smaller array (swap if needed) — binary search on the shorter array.
2. Binary search `i` in `[0, m]`:
   - Compute `j = half - i` where `half = floor((m + n + 1) / 2)`.
   - Compute boundary values: `maxLeft1 = nums1[i-1]` (or -∞), `minRight1 = nums1[i]` (or +∞), same for nums2.
   - If `maxLeft1 > minRight2`: too far right → `right = i - 1`.
   - If `maxLeft2 > minRight1`: too far left → `left = i + 1`.
   - Else: correct partition.
3. From the correct partition:
   - Odd total length: `median = max(maxLeft1, maxLeft2)`
   - Even total length: `median = (max(maxLeft1, maxLeft2) + min(minRight1, minRight2)) / 2`

## Complexity
- Time: O(log(min(m, n)))
- Space: O(1)
