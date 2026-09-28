def number_of_arithmetic_slices(nums: list[int]) -> int:
    dp, total = 0, 0

    for i in range(2, len(nums)):
        if nums[i] - nums[i - 1] == nums[i - 1] - nums[i - 2]:
            dp += 1
            total += dp
        else:
            dp = 0

    return total
