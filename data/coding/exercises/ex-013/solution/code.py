def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    if len(nums1) > len(nums2):
        return find_median_sorted_arrays(nums2, nums1)

    m, n = len(nums1), len(nums2)
    half = (m + n + 1) // 2
    left, right = 0, m

    while left <= right:
        i = (left + right) // 2
        j = half - i

        max_left1 = float('-inf') if i == 0 else nums1[i - 1]
        min_right1 = float('inf') if i == m else nums1[i]
        max_left2 = float('-inf') if j == 0 else nums2[j - 1]
        min_right2 = float('inf') if j == n else nums2[j]

        if max_left1 > min_right2:
            right = i - 1
        elif max_left2 > min_right1:
            left = i + 1
        else:
            max_left = max(max_left1, max_left2)
            min_right = min(min_right1, min_right2)
            if (m + n) % 2 == 1:
                return max_left
            return (max_left + min_right) / 2

    return 0
