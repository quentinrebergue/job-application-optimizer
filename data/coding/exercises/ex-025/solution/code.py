def split_array(nums: list[int], k: int) -> int:
    left, right = max(nums), sum(nums)

    def can_split(max_sum: int) -> bool:
        splits, current = 1, 0
        for num in nums:
            if current + num > max_sum:
                splits += 1
                current = 0
            current += num
        return splits <= k

    while left < right:
        mid = (left + right) // 2
        if can_split(mid):
            right = mid
        else:
            left = mid + 1

    return left
