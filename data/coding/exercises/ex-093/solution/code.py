def max_product(nums: list[int]) -> int:
    curr_max = curr_min = best = nums[0]

    for num in nums[1:]:
        if num < 0:
            curr_max, curr_min = curr_min, curr_max
        curr_max = max(num, curr_max * num)
        curr_min = min(num, curr_min * num)
        best = max(best, curr_max)

    return best
