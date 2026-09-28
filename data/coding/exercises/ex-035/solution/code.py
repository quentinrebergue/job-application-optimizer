def min_sub_array_len(target: int, nums: list[int]) -> int:
    left, total, min_len = 0, 0, float('inf')

    for right in range(len(nums)):
        total += nums[right]
        while total >= target:
            min_len = min(min_len, right - left + 1)
            total -= nums[left]
            left += 1

    return 0 if min_len == float('inf') else min_len
