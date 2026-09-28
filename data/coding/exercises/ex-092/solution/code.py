def max_sub_array(nums: list[int]) -> int:
    curr = best = nums[0]

    for num in nums[1:]:
        curr = max(num, curr + num)
        best = max(best, curr)

    return best
