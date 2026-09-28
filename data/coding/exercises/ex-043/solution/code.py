def number_of_subarrays(nums: list[int], k: int) -> int:
    count = {0: 1}
    odds, result = 0, 0

    for num in nums:
        odds += num & 1
        result += count.get(odds - k, 0)
        count[odds] = count.get(odds, 0) + 1

    return result
